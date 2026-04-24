import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { NgbModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Alert } from '../../../alerts/alert/alert';
import { TypeAnnonce } from '../../models/type-annonce.model';
import { Subscription } from 'rxjs';
import { TypeAnnonceService } from '../../services/type-annonce.service';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';
import { TypeAnnonceEditModal } from '../type-annonce-detail/type-annonce-edit';

@Component({
  selector: 'app-type-annonce-list',
  imports: [CommonModule, RouterModule, NgbTooltipModule, Alert],
  templateUrl: './type-annonce-list.html',
  styleUrl: './type-annonce-list.scss',
  providers: [DatePipe]
})
export class TypeAnnonceList implements OnInit{

  typeAnnonces: TypeAnnonce[] = [];
  isLoading: boolean = true;
  errorMessage: string | null = null;

  isSubmitting = false;

  messageRedirecting: string = '';
  responseType: 'success' | 'error' = 'success';
  successMessage: string = '';

  private currentOpenModal: any;
  private subscriptions = new Subscription();
  
  private router = inject(Router);
  private modalService = inject(NgbModal);
  private datePipe = inject(DatePipe);

  private typeService = inject(TypeAnnonceService);
  private confirmation = inject(ConfirmationService);

  ngOnInit(): void {
    this.isLoading = true;
    this.typeService.fetchTypeAnnonces();
    this.subscribeToTypeAnnonces();
  }

  clearSuccessMessage() {
    this.successMessage = '';
  }

  clearErrorMessage() {
    this.errorMessage = '';
  }

  private subscribeToTypeAnnonces(): void {
    this.isLoading = true;
    this.subscriptions.add(this.typeService.getTypesAnnonces().subscribe({
      next: data => {
        this.typeAnnonces = data;
        this.isLoading = false;
      },
      error: err => {
        this.errorMessage = `❌ Erreur lors du chargement des types d'annonces: 
          (status: ${err.status}) -> (message: ${err.statusText})`;
        this.responseType = 'error';
        this.isLoading = false;
        this.isSubmitting = false;
      }
    }));
  }

  onCreate(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    //this.router.navigate(['/types-annonces/new']);
    this.openEditModal(null);
  }
    
  onEdit(typeAnnonce: TypeAnnonce, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    this.openEditModal(typeAnnonce.slug);
  }

  /**
   * Ouvre une modale de confirmation avant de supprimer un type d'annonce.
   * @param typeAnnonceId L'ID du type d'annonce à supprimer.
   */
  async onDelete(typeAnnonce: TypeAnnonce) {

    const formattedDate = this.datePipe.transform(typeAnnonce.created_at, 'dd/MM/yyyy');

    const confirmed = await this.confirmation.confirm({
      title: 'Confirmation',
      type: 'bg-danger',
      message: `Êtes-vous sûr de vouloir supprimer ce type d'annonce ?`,
      icon: 'bi-trash',
      iconMessageSmall: '⚠️',
      iconMessageBig: '❌',
      confirmLabel: 'Oui, supprimer',
      cancelLabel: 'Annuler',
      zonePhraseOne: `Type of annonce: ${typeAnnonce.nom}`,
      zonePhraseTwo: `Date of creation: ${formattedDate}`
    });

    //const confirmed = await this.confirmation.confirmDelete('ce type d\'annonce');

    if (!confirmed) return;

    try {
      this.typeService.deleteTypeAnnonce(typeAnnonce.slug).subscribe({
        next: () => {
          this.successMessage = '📥 Type d\'annonce supprimé avec succès. !';
          this.isLoading = false;
          this.isSubmitting = false;
          this.typeService.fetchTypeAnnonces();
        },
        error: (err) => {
          this.errorMessage = `❌ Erreur lors de la suppression du type d\'annonce: 
            (status: ${err.status}) -> (message: ${err.statusText})`;
          this.responseType = 'error';
          this.isLoading = false;
          this.isSubmitting = false;
        }
      });
    } finally {
      setTimeout(() => {
        this.modalService.dismissAll();
      }, 6000);
    }
  }
      
  openEditModal(typeAnnonceSlug: string | null = null): void {
    const modalRef = this.modalService.open(TypeAnnonceEditModal, {
      size: 'lg',
      backdrop: 'static',
      centered: true,
      keyboard: false
    });
      
    if (typeAnnonceSlug) {
      modalRef.componentInstance.typeAnnonceSlug = typeAnnonceSlug;
    }
      
    this.currentOpenModal = modalRef;

    const isEdit = !!typeAnnonceSlug;
      
    modalRef.result.then(
      (result) => {
        if (result) { 
          this.subscribeToTypeAnnonces() 
          this.confirmation.inform({ 
            context: isEdit ? 'update' : 'create', 
            title: isEdit ? 'Type d\'annonce modifié' : 'Type d\'annonce créé', 
            message: isEdit
              ? 'Les informations ont été mises à jour avec succès.'
              : 'Le type d\'annonce a été créé avec succès.', 
            type: isEdit ? 'bg-primary' : 'bg-success', 
            closeLabel: 'Ok' 
          }); 
        }
      }
    ).finally(() => this.currentOpenModal = null);
  }
}
