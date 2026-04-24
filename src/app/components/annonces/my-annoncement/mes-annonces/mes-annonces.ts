import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { NgbModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Alert } from '../../../alerts/alert/alert';
import { RelativeTimePipe } from '../../../../pipe/relative-time.pipe';
import { AnnonceListItem } from '../../models/annonce.model';
import { Subscription } from 'rxjs';
import { AnnonceService } from '../../services/annonce.service';
import { Authentication } from '../../../../auth/core/authentication';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';
import { AnnonceEditModal } from '../annonce-edit-modal/annonce-edit-modal';
import { AnnonceDetail } from '../annonce-detail/annonce-detail';

@Component({
  selector: 'app-mes-annonces',
  imports: [CommonModule, RouterModule, NgbTooltipModule, 
            Alert, RelativeTimePipe],
  templateUrl: './mes-annonces.html',
  styleUrl: './mes-annonces.scss',
  providers: [DatePipe]
})
export class MesAnnonces {

  public annonces: AnnonceListItem[] = [];
  public isLoading: boolean = true;
  public errorMessage: string | null = null;
  private currentOpenModal: any;

  isSubmitting = false;

  messageRedirecting: string = '';
  responseType: 'success' | 'error' = 'success';
  successMessage: string = '';

  private subscriptions = new Subscription();

  private readonly router = inject(Router);
  private readonly modalService = inject(NgbModal);
  private datePipe = inject(DatePipe);

  // Services
  private readonly annonceService = inject(AnnonceService);
  protected readonly auth = inject(Authentication);
  private confirmation = inject(ConfirmationService);

  ngOnInit(): void {
    this.initializeComponent();
  }

  clearSuccessMessage() {
    this.successMessage = '';
  }

  clearErrorMessage() {
    this.errorMessage = '';
  }

  statusMap: { [key: string]: { label: string; class: string } } = {
    DRAFT:   { label: 'Brouillon', class: 'bg-primary' },
    PENDING: { label: 'En attente de validation', class: 'bg-secondary' },
    ARCHIVED:  { label: 'Archivé', class: 'bg-info' },
    PUBLISHED: { label: 'Publié', class: 'bg-success' },
    REJECTED:  { label: 'Rejetée', class: 'bg-danger' }
  };

  getStatusLabel(statut: string): string {
    return this.statusMap[statut]?.label || 'N/A';
  }

  getStatusClass(statut: string): string {
    return this.statusMap[statut]?.class || 'bg-light text-muted';
  }

  /**
   * Initialisation du composant
   */
  private initializeComponent(): void {
    this.subscribeToAnnonces();
  }

  /**
   * Abonnement à ses propres annonces
   */
  private subscribeToAnnonces(): void {
    this.isLoading = true;
    this.subscriptions.add(
      this.annonceService.getMesAnnonces()
      .subscribe({
        next: (data) => {
          this.annonces = Array.isArray(data) ? data : (data as any).results ?? [];
          this.isLoading = false;
        },
        error: (error) => {
          this.handleError(error);
        }
      })
    );
  }

  /**
   * Gestion des erreurs
   */
  private handleError(error: any): void {
    this.errorMessage = `Erreur lors de la mise à jour de l\'annonce: 
    (status: ${error.status}) -> (message: ${error.statusText})`;
    this.responseType = 'error';
    this.isLoading = false;
  }

  openEditModal(annonceId: string | null = null): void {
    const modalRef = this.modalService.open(AnnonceEditModal, {
      size: 'lg',
      backdrop: 'static',
      centered: true,
      keyboard: false
    });
        
    if (annonceId) {
      modalRef.componentInstance.annonceId = annonceId;
    }
        
    this.currentOpenModal = modalRef;
        
    modalRef.result.then(
      (result) => {
        this.subscribeToAnnonces();
      },
      (reason) => {
        this.subscribeToAnnonces();
      }
    ).finally(() => this.currentOpenModal = null);
  }

  onCreate(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    this.openEditModal(null);
  }
      
  onEdit(annonce: AnnonceListItem, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    this.openEditModal(annonce.id);
  }

  onDetail(annonce: AnnonceListItem): void {
    if (annonce.id) {
      this.router.navigate(['/lango/annonces', annonce.id, 'detail']);
      console.log('/lango/annonces', annonce.id, 'detail');
    }
  }

  openDetailModal(annonce: AnnonceListItem): void {
    const modalRef = this.modalService.open(AnnonceDetail, {
      size: 'lg',
      backdrop: 'static',
      centered: true,
      keyboard: false
    });

    modalRef.componentInstance.annonceId = annonce.id;

    modalRef.result.then(
      () => {},
      () => {}
    );
  }

  /**
   * Ouvre une modale de confirmation avant de supprimer une annonce.
   * @param annonceId L'ID de l'annonce à supprimer.
   */
  async onDelete(annonce: AnnonceListItem) {

    const formattedDate = this.datePipe.transform(annonce.created_at, 'dd/MM/yyyy');

    const confirmed = await this.confirmation.confirm({
      title: 'Confirmation de suppression',
      type: 'bg-danger',
      message: `Êtes-vous sûr de vouloir supprimer cette annonce ?`,
      icon: 'bi-check-circle',
      iconMessageSmall: '⚠️',
      iconMessageBig: '❌',
      confirmLabel: 'Oui',
      cancelLabel: 'Non',
      zonePhraseOne: `Title of annonce: ${annonce.titre}`,
      zonePhraseTwo: `Status of annonce: ${annonce.statut}`,
      zonePhraseThree: `Date of creation: ${formattedDate}`
    });

    if (!confirmed) return;

    try {
      this.annonceService.deleteAnnonce(annonce.id).subscribe({
        next: () => {
          this.successMessage = '📥 Annonce supprimée avec succès !';
          this.isLoading = false;
          this.isSubmitting = false;
        },
        error: (err) => {
          this.errorMessage = `❌ Erreur lors de la suppression de l\'annonce: 
          (status: ${err.status}) -> (message: ${err.statusText})`;
          this.responseType = 'error';
          this.isLoading = false;
          this.isSubmitting = false;
        }
      })
    } finally {
      setTimeout(() => {
        this.modalService.dismissAll();
      }, 3000);
    }
  }

  /**
   * Nettoyage des abonnements
   */
  private cleanupSubscriptions(): void {
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
  }

  isApproved(role: string[]): boolean | null {
    return this.auth.hasAnyRole(role);
  }

  ngOnDestroy(): void {
    this.cleanupSubscriptions();
  }

}
