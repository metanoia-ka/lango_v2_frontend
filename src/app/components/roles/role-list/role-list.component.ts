import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Role } from '../../../models/role.model';
import { RoleService } from '../../../services/role.service';
import { RoleEditModalComponent } from '../role-edit-modal/role-edit-modal.component';
import { Alert } from '../../alerts/alert/alert';
import { Subscription } from 'rxjs';
import { ConfirmationService } from '../../confirmation-modal/service/confirmation';

@Component({
  selector: 'app-role-list',
  standalone: true,
  imports: [CommonModule, RouterModule, NgbModule, Alert],
  templateUrl: './role-list.component.html',
  styleUrl: './role-list.component.scss'
})
export class RoleListComponent implements OnInit, OnDestroy {
  roles: Role[] = [];
  private currentOpenModal: any;

  isLoading: boolean = false;
  isSubmitting: boolean = false;
  errorMessage: string | null = null;

  messageRedirecting: string = '';
  responseType: 'success' | 'danger' | 'info' = 'success';
  successMessage: string = '';

  private modalService = inject(NgbModal);
  private subscription = new Subscription();

  private roleService = inject(RoleService);
  private confirmation = inject(ConfirmationService);

  ngOnInit(): void {
    this.isLoading = true;
    this.roleService.fetchRoles();
    this.loadRoles();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadRoles(): void {
    this.isLoading = true;
    this.subscription.add(
      this.roleService.getRoles().subscribe({
        next: data => {
          this.roles = data;
          this.isLoading = false;
          this.isSubmitting = false;
        },
        error: err => {
          this.errorMessage = `❌ Erreur lors du chargement des rôles: 
              (status: ${err.status}) -> (message: ${err.statusText})`;
          this.responseType = 'danger';
          this.isLoading = false;
          this.isSubmitting = false;
        }
      })
    );
  }

  clearSuccessMessage() {
    this.successMessage = '';
  }

  clearErrorMessage() {
    this.errorMessage = '';
  }

  onCreateNewRole(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.openEditModal(null);
  }

  onEdit(role: Role, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.openEditModal(role.id);
    
  }

  /**
   * Ouvre une modale de confirmation pour la suppression d'un rôle.
   * @param role L'objet Role à supprimer.
   */
  async onDelete(role: Role) {
    
    const confirmed = await this.confirmation.confirmDelete('ce rôle');

    if (!confirmed) return;

    try {
      this.deleteRole(role);
    } finally {
      setTimeout(() => {
        this.modalService.dismissAll();
      }, 6000);
    }
  }

  deleteRole(r: Role): void {
    this.roleService.deleteRole(r.id).subscribe({
      next: () => {
        this.loadRoles();
        this.confirmation.inform({
          context:    'delete',
          title:      'Rôle supprimé',
          message:    `"${r.name}" a été supprimé définitivement.`,
          type:       'bg-danger',
          closeLabel: 'Ok',
        });
        this.successMessage = '📥 Rôle supprimé avec succès !';
        this.isLoading = false;
        this.isSubmitting = false;
      },
      error: (err) => {
        this.errorMessage = `❌ Erreur lors de la suppression du rôle 
          (status: ${err.status}) -> (message: ${err.statusText})`;
        this.responseType = 'danger';
        this.isLoading = false;
        this.isSubmitting = false;
      }
    });
  }

  openEditModal(roleId: string | null = null): void {
    const modalRef = this.modalService.open(RoleEditModalComponent, {
      size: 'md',
      backdrop: 'static',
      centered: true ,
      keyboard: false
    });

    if (roleId) {
      modalRef.componentInstance.roleId = roleId;
    }

    this.currentOpenModal = modalRef;

    const isEdit = !!roleId;

    modalRef.result.then(
      (result) => {
        if (result) {
          this.loadRoles();
          this.confirmation.inform({
            context:    isEdit ? 'update' : 'create',
            title:      isEdit ? 'Rôle modifié' : 'Rôle créé',
            message:    isEdit
              ? 'Les informations ont été mises à jour avec succès.'
              : 'Le nouveau rôle a été créé avec succès.',
            type:       isEdit ? 'bg-primary' : 'bg-success',
            closeLabel: 'Ok',
          });
        }
      },
      (reason) => {}
    ).finally(() => this.currentOpenModal = null);
  }
}
