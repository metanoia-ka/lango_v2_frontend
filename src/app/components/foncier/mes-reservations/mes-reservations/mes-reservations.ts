import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ReservationService } from '../../services/reservation';
import { Authentication } from '../../../../auth/core/authentication';
import { ToastService } from '../../../../services/toast.service';
import { Subject, takeUntil } from 'rxjs';
import { Reservation, ReservationStatut } from '../../models/reservation-parcelle.model';
import { OffreNegociation } from '../offre-negociation/offre-negociation';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';
import { RelativeTimePipe } from '../../../../pipe/relative-time.pipe';

@Component({
  selector: 'app-mes-reservations',
  standalone: true,
  imports: [CommonModule, RouterModule, RelativeTimePipe],
  templateUrl: './mes-reservations.html',
  styleUrl: './mes-reservations.scss'
})
export class MesReservations implements OnInit, OnDestroy {

  private modal          = inject(NgbModal);
  private destroy$       = new Subject<void>();
  private reservationSvc = inject(ReservationService);
  private auth           = inject(Authentication);
  private toast          = inject(ToastService);
  private confirmationSvc = inject(ConfirmationService);
 
  user         = this.auth.currentUserSignal;
  reservations = this.reservationSvc.mesReservations;
  loading      = this.reservationSvc.loading;
  annulLoading = signal<string | null>(null);
 
  stats = computed(() => {
    const list = this.reservations();
    return {
      enAttente:     list.filter(r => r.statut === 'EN_ATTENTE').length,
      enNegociation: list.filter(r => r.statut === 'NEGOCIATION').length,
      attribuee:     list.filter(r => r.statut === 'ATTRIBUEE').length,
      expiree:       list.filter(r => r.statut === 'EXPIREE').length,
      annulee:       list.filter(r => r.statut === 'ANNULEE').length,
    };
  });
 
  readonly STATUT_LABELS: Record<ReservationStatut, string> = {
    EN_ATTENTE:  'En attente',
    NEGOCIATION: 'En négociation',
    ATTRIBUEE:   'Attribuée',
    EXPIREE:     'Expirée',
    ANNULEE:     'Annulée',
  };
 
  readonly STATUT_CLASSES: Record<ReservationStatut, string> = {
    EN_ATTENTE:  'badge-pending',
    NEGOCIATION: 'badge-warning',
    ATTRIBUEE:   'badge-success',
    EXPIREE:     'badge-muted',
    ANNULEE:     'badge-danger',
  };
 
  ngOnInit(): void {
    this.reservationSvc.getMesReservations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (err) => this.toast.showError(err.error?.detail ?? 'Erreur chargement.')
      });
  }
 
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
 
  ouvrirNegociation(resa: Reservation): void {
    const ref = this.modal.open(OffreNegociation, {
      size: 'lg', centered: true, backdrop: 'static'
    });
    ref.componentInstance.reservation = resa;
    ref.result.then(
      (result) => {
        if (result === 'acceptee' || result === 'attribuee') {
          this.reservationSvc.getMesReservations()
            .pipe(takeUntil(this.destroy$))
            .subscribe();
        }
      },
      () => {}
    );
  }
 
  async annuler(resa: Reservation): Promise<void> {
    const ok = await this.confirmationSvc.confirm({
      title:        'Annuler la réservation',
      type:         'bg-info',
      message:      `Annuler la réservation de ${resa.parcelle_numero} ? ` +
                    `Vous recevrez un remboursement partiel.`,
      icon:         'bi-box-arrow-right',
      confirmLabel: 'Oui, annuler',
      cancelLabel:  'Fermer',
    });
    if (!ok) return;
 
    this.annulLoading.set(resa.id);
    this.reservationSvc.annulerReservation(resa.id).subscribe({
      next: (res) => {
        this.annulLoading.set(null);
        this.toast.showInfo(res.detail ?? 'Réservation annulée.');
        this.reservationSvc.getMesReservations()
          .pipe(takeUntil(this.destroy$))
          .subscribe();
      },
      error: (err) => {
        this.annulLoading.set(null);
        this.toast.showError(err.error?.detail ?? 'Erreur annulation.');
      }
    });
  }
 
  peutAnnuler(resa: Reservation): boolean {
    return (resa.statut === 'EN_ATTENTE' || resa.statut === 'NEGOCIATION')
           && !resa.est_expiree;
  }
 
  peutNegocier(resa: Reservation): boolean {
    return (resa.statut === 'EN_ATTENTE' || resa.statut === 'NEGOCIATION')
           && !resa.est_expiree;
  }
 
  /**
   * Libellé dynamique du bouton de négociation selon l'état de l'offre active.
   * BUG FIX : 'NEGOCIATION' n'est pas un statut d'offre.
   * Les statuts d'offre valides : EN_ATTENTE, CONTRE_PROPOSEE, ACCEPTEE, REFUSEE, EXPIREE
   */
  libelleBoutonNegociation(resa: Reservation): string {
    const offre = resa.offre_active;
    if (!offre) {
      // Pas d'offre = vendeur n'a pas encore proposé
      if (this.auth.hasAnyRole(['Vendor', 'Admin', 'Manager'])) {
        return 'Initier la négociation';
      }
      return 'En attente du vendeur';
    }
    // Offre présente — adapter le libellé selon son statut
    switch (offre.statut) {
      case 'EN_ATTENTE':
        // Vendor a fait une offre → l'acheteur doit répondre
        if (this.auth.hasRole('Purchaser')) return 'Répondre à l\'offre';
        return 'En attente du client';
      case 'CONTRE_PROPOSEE':
        // Le client a contre-proposé → vendor doit répondre
        if (this.auth.hasAnyRole(['Vendor', 'Admin', 'Manager'])) return 'Répondre à la contre-offre';
        return 'En attente du vendeur';
      case 'ACCEPTEE':
        return 'Offre acceptée';
      case 'REFUSEE':
        return 'Reprendre la négociation';
      default:
        return 'Voir la négociation';
    }
  }
 
  trackById(_: number, r: Reservation): string { return r.id; }

}
