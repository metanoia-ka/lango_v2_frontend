import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, 
          ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Role } from '../../../models/role.model';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { RoleService } from '../../../services/role.service';
import { Subscription } from 'rxjs';
import { Alert } from '../../alerts/alert/alert';
import { UserService } from '../service/user.service';


interface UserCreateData {
  username: string;
  password: string;
  roles: string[];
}

@Component({
  selector: 'app-user-edit-modal',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, Alert],
  templateUrl: './user-edit-modal.html',
  styleUrls: ['./user-edit-modal.scss']
})
export class UserEditModal implements OnInit, OnDestroy {
  
  @Input() userId: string | null = null;
  userForm!: FormGroup;
  isEditMode: boolean = false;

  isLoading: boolean = false;
  isSubmitting: boolean = false;
  errorMessage: string | null = null;
  rolesAvailable: Role[] = [];

  countdown = 0;
  messageRedirecting: string = '';
  responseType: 'success' | 'error' = 'success';
  successMessage: string = '';

  private subscription = new Subscription();

  private activeModal = inject(NgbActiveModal);
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private roleService = inject(RoleService);

  initForm() {
    this.userForm = this.fb.group({
      username: ['', Validators.required],
      phone: ['', [Validators.required,  Validators.pattern('^[+]?[0-9]{8,15}$')]],
      password: ['', Validators.required],
      roles: new FormControl<string[]>([], Validators.required),
      is_active: new FormControl(true),
      is_superuser: new FormControl(false)
    });
  }

  clearSuccessMessage() {
    this.successMessage = '';
  }

  clearErrorMessage() {
    this.errorMessage = '';
  }

  ngOnInit(): void {
    this.initForm();
    this.isEditMode = !!this.userId;

    this.loadRoles();

    if (this.isEditMode) {
      this.loadUserDetail();
    } else {
      this.userForm.get('password')?.setValidators([Validators.required]);
      this.userForm.get('password')?.updateValueAndValidity();
    }
  }

  private loadUserDetail(): void {
    this.isLoading = true;
    this.subscription.add(
      this.userService.getUserById(this.userId!).subscribe({
        next: (user) => {
          this.userForm.get('password')?.setValidators(null);
          this.userForm.get('password')?.updateValueAndValidity();

          const roleNames = user.roles.map(role => role.name);
          this.userForm.patchValue({
            username: user.username,
            phone: user.phone,
            roles: roleNames,
            is_active: user.is_active,
            is_superuser: user.is_superuser
          });
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = `❌ Erreur lors du chargement de l'utilisateur : 
          (status: ${err.status}) -> (message: ${err.statusText})`;
          this.isLoading = false;
        }
      })
    );
  }

  private loadRoles(): void {
    this.isLoading = true;
    this.subscription.add(
      this.roleService.role$.subscribe(roles => {
        this.rolesAvailable = roles;
        this.isLoading = false;
      })
    );
    this.roleService.fetchRoles();
  }

  toggleRoleSelection(roleName: string): void {
    // Récupère le tableau des rôles actuellement sélectionnés depuis le formulaire
    const currentRoles = this.userForm.get('roles')?.value as string[];
    let updatedRoles: string[];

    // Vérifie si le rôle est déjà dans le tableau
    if (currentRoles.includes(roleName)) {
      // Si oui, le retire
      updatedRoles = currentRoles.filter(role => role !== roleName);
    } else {
      // Si non, l'ajoute
      updatedRoles = [...currentRoles, roleName];
    }

    // Met à jour la valeur du form control 'roles'
    this.userForm.get('roles')?.setValue(updatedRoles);
    // Marque le form control comme "touché" pour la validation
    this.userForm.get('roles')?.markAsTouched();
  }

  onSubmit(event?: Event): void {

    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (this.userForm.invalid) {
      this.errorMessage = 'Veuillez remplir tous les champs requis.';
      this.userForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.isSubmitting = true;

    const selectedRoleNames: string[] = this.userForm.value.roles;
    const userData = {
      username: this.userForm.value.username,
      phone: this.userForm.value.phone,
      roles: selectedRoleNames,
      is_active: this.userForm.value.is_active,
      is_superuser: this.userForm.value.is_superuser
    };

    if (this.isEditMode) {
      this.subscription.add(
        this.userService.updateUser(this.userId!, userData).subscribe({
          next: () => {
            this.successMessage = '📥 Utilisateur mis à jour avec succès !';
            this.isLoading = false;
            this.isSubmitting = false;
            
            setTimeout(() => {
              this.activeModal.close('saved')
            }, 3000);
          },
          error: (err) => {
            this.errorMessage = `❌ Erreur lors de la mis à jour de l'utilisateur: 
                (status: ${err.status}) -> (message: ${err.statusText})`;
            this.responseType = 'error';
            this.isLoading = false;
            this.isSubmitting = false;
          }
        })
      );
    } 
    else {
      const createData: UserCreateData = {
        ...userData,
        password: this.userForm.value.password
      };

      this.subscription.add(
        this.userService.createUser(createData).subscribe({
          next: (newUser) => {
            this.successMessage = '📥 Utilisateur créé avec succès !';
            this.isLoading = false;
            this.isSubmitting = false;
            this.activeModal.close(newUser);
          },
          error: (err) => {
            this.errorMessage = `❌ Erreur lors de la création de l'utilisateur: 
              (status: ${err.status}) -> (message: ${err.statusText})`;
            this.responseType = 'error';
            this.isLoading = false;
            this.isSubmitting = false;
          }
        })
      );
    }
  }

  onCancel(): void {
    this.activeModal.dismiss();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
