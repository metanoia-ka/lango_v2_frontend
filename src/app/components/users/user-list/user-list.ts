import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { User } from '../../../models/user.model';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { UserEditModal } from '../user-edit-modal/user-edit-modal';
import { Alert } from '../../alerts/alert/alert';
import { ConfirmationService } from '../../confirmation-modal/service/confirmation';
import { Subscription } from 'rxjs';
import { UserService } from '../service/user.service';

@Component({
  selector: 'app-user-list',
  standalone:  true,
  imports: [CommonModule, RouterModule, Alert],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
  providers: [DatePipe]
})
export class UserList implements OnInit, OnDestroy {

  users: User[] = [];
  errorMessage: string | null = null;
  private currentOpenModal: any;

  isSubmitting = false;
  isLoading: boolean = false;
  
  countdown = 0;
  messageRedirecting: string = '';
  responseType: 'success' | 'error' = 'success';
  successMessage: string = '';
  
  
  clearSuccessMessage() {
    this.successMessage = '';
  }
  
  clearErrorMessage() {
    this.errorMessage = '';
  }

  private datePipe = inject(DatePipe);
  private subscription = new Subscription();

  private modalService = inject(NgbModal);
  private userService = inject(UserService);
  private confirmation = inject(ConfirmationService);

  ngOnInit(): void {
    this.isLoading = true;
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadUsers(): void {
    this.isLoading = true;
    this.userService.fetchUsers();
    this.subscription.add(
      this.userService.getUsers().subscribe({
        next: data => {
          this.users = data;
          this.isLoading = false;
        },
        error: err => {
          this.errorMessage = `Une Erreur est survenue lors du chargement des users: 
              (status: ${err.status}) -> (message: ${err.statusText})`;
          this.responseType = 'error';
          this.isLoading = false;
        }
      })
    );
  }

  onCreateNewUser(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.openEditModal(null);
  }
    
  onEdit(user: User, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.openEditModal(user.id);
  }

  openEditModal(userId: string | null = null): void {
    const modalRef = this.modalService.open(UserEditModal, {
      size: 'md',
      backdrop: 'static',
      centered: true,
      keyboard: false
    });
    
    if (userId) {
      modalRef.componentInstance.userId = userId;
    }
    
    this.currentOpenModal = modalRef;

    const isEdit = !!userId;
    
    modalRef.result.then(
      (result) => {
        if (result) {
          this.loadUsers();
          this.confirmation.inform({
            context:    isEdit ? 'update' : 'create',
            title:      isEdit ? 'Utilisateur modifié' : 'Utilisateur créé',
            message:    isEdit
              ? 'Les informations ont été mises à jour avec succès.'
              : 'Le nouvel utilisateur a été créé avec succès.',
            type:       isEdit ? 'bg-primary' : 'bg-success',
            closeLabel: 'Ok',
          });
        }
      },
      (reason) => {}
    ).finally(() => this.currentOpenModal = null);
  }

  /**
  * Ouvre une modale de confirmation avant de supprimer un géomètre.
  * @param userId L'ID du géomètre à supprimer.
  */
  async onDelete(user: User) {

    const confirmed = await this.confirmation.confirmDelete('cet utilisateur ');

    if (!confirmed) return;

    try {
      this.onDeleteModal(user);
    } finally {
      setTimeout(() => {
        this.modalService.dismissAll();
      }, 6000);
    }
  }

  onDeleteModal(u: User) {
    this.userService.deleteUser(u.id).subscribe({
      next: () => {
        this.loadUsers();
        this.confirmation.inform({
          context:    'delete',
          title:      'Utilisateur supprimé',
          message:    `"${u.username}" a été supprimé définitivement.`,
          type:       'bg-danger',
          closeLabel: 'Ok',
        });
        this.successMessage = '📥 Utilisateur supprimé avec succès. !';
        this.isLoading = false;
        this.isSubmitting = false;
      },
      error: (err) => {
        const detail = err.error?.detail
                  ?? err.error?.error
                  ?? err.statusText
                  ?? 'Erreur inconnue';
        this.errorMessage = `❌ Suppression impossible : ${detail}`;
        this.responseType = 'error';
        this.isLoading = false;
        this.isSubmitting = false;
      }
    });
  }

  /**
   * Formate un tableau de rôles en une chaîne de caractères.
   * @param roles Le tableau de rôles.
   * @returns Une chaîne de caractères avec les noms des rôles séparés par une virgule.
  */
  formatRoles(roles: any[]): string {
    if (!roles || roles.length === 0) {
      return 'Pas de rôle';
    }
    // Si c'est un tableau de chaînes (["Admin", "Manager"])
    if (typeof roles[0] === 'string') {
      return roles.join(', ');
    }
    // Si c'est un tableau d'objets ([{name: "Admin"}])
    if (typeof roles[0] === 'object' && roles[0]?.name) {
      // Ajout d'un filtre pour les objets null/undefined
      return roles.filter(role => !!role).map(r => r.name).join(', ');
    }
    return 'Format de rôle inconnu';
  }
}
