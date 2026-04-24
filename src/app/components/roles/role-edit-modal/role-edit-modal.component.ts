import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbActiveModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { RoleService } from '../../../services/role.service';
import { Alert } from '../../alerts/alert/alert';


@Component({
  selector: 'app-role-edit-modal',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, NgbModule, Alert],
  templateUrl: './role-edit-modal.component.html',
  styleUrl: './role-edit-modal.component.scss'
})
export class RoleEditModalComponent implements OnInit {
  @Input() roleId: string | null = null;

  roleForm!: FormGroup;
  isEditMode: boolean = false;
  isLoading: boolean = false;
  isSubmitting: boolean = false;
  errorMessage: string | null = null;

  messageRedirecting: string = '';
  responseType: 'success' | 'error' | 'info'= 'success';
  successMessage: string = '';

  private activeModal = inject(NgbActiveModal);
  private fb = inject(FormBuilder);

  private roleService = inject(RoleService);
  
  clearSuccessMessage() {
    this.successMessage = '';
  }

  clearErrorMessage() {
    this.errorMessage = '';
  }

  ngOnInit(): void {
    this.initForm();
    this.isEditMode = !!this.roleId;

    if (this.isEditMode) {
      this.loadRoleData();
    }
  }

  initForm(): void {
    this.roleForm = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
  }

  private loadRoleData(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.roleService.getRoleById(this.roleId!).subscribe({
      next: (role) => {
        this.roleForm.patchValue({ 
          name: role.name, 
          description: role.description 
        });
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = `❌ Erreur lors du chargement du rôle: 
          (status: ${err.status}) -> (message: ${err.statusText})`;
        this.responseType = 'info';
        this.isLoading = false;
        this.isSubmitting = false;
      }
    });
  }

  onSubmit(event?: Event): void {

    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (this.roleForm.invalid) {
      this.errorMessage = `❌ Veuillez remplir tous les champs requis`;
      this.responseType = 'error';
      this.roleForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;
    const roleData = this.roleForm.value;

    const operation = this.isEditMode 
      ? this.roleService.updateRole(this.roleId!, roleData)
      : this.roleService.createRole(roleData);

    operation.subscribe({
      next: (result) => {
        this.successMessage = this.isEditMode 
          ? '📥 Rôle mis à jour avec succès.' 
          : '📥 Rôle créé avec succès.';
          
        this.isLoading = false;
        this.isSubmitting = false;
        setTimeout(() => {
          this.activeModal.close(result);
        }, 2000);
      },
      error: (err) => {
        const action = this.isEditMode ? 'mise à jour' : 'création';
        this.errorMessage = `❌ Erreur lors de ${action} du rôle 
          (status: ${err.status}) -> (message: ${err.message})`;
        this.responseType = 'error';
        this.isLoading = false;
        this.isSubmitting = false;
      }
    });
  }

  onCancel(): void {
    this.activeModal.dismiss();
  }
}