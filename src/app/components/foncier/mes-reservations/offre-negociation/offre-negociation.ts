import { CommonModule } from '@angular/common';
import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Offre, OffreStatut, Reservation } from '../../models/reservation-parcelle.model';
import { ToastService } from '../../../../services/toast.service';
import { Authentication } from '../../../../auth/core/authentication';
import { ReservationService } from '../../services/reservation';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-offre-negociation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './offre-negociation.html',
  styleUrl: './offre-negociation.scss'
})
export class OffreNegociation implements OnInit {

  @Input() reservation!: Reservation;
 
  private activeModal    = inject(NgbActiveModal);
  private reservationSvc = inject(ReservationService);
  private auth           = inject(Authentication);
  private toast          = inject(ToastService);
 
  user          = this.auth.currentUserSignal;
  offres        = signal<Offre[]>([]);
  loading       = signal(false);
  loadingAction = signal(false);
  error         = signal('');
  success       = signal('');
 
  prixPropose       = signal<number | null>(null);
  prixContrePropose = signal<number | null>(null);
 
  // ── Rôles ────────────────────────────────────────────────────────────────
  estVendeur  = computed(() => this.auth.hasAnyRole(['Vendor', 'Admin', 'Manager']));
  estAcheteur = computed(() =>
    this.auth.hasRole('Purchaser') && !this.estVendeur()
  );
 
  // ── Offre active : la première non terminée ───────────────────────────────
  offreActive = computed(() =>
    this.offres().find(o =>
      o.statut === 'EN_ATTENTE' || o.statut === 'CONTRE_PROPOSEE'
    ) ?? null
  );
 
  // ══════════════════════════════════════════════════════════════════════════
  // PERMISSIONS — corrigées
  // ══════════════════════════════════════════════════════════════════════════
 
  // VENDOR peut initier une offre si pas d'offre active ouverte
  // BUG 1 FIX : statut NEGOCIATION aussi autorisé (c'est le statut normal
  // une fois qu'une 1ère offre existe)
  peutFaireOffreVendeur = computed(() =>
    this.estVendeur() &&
    !this.offreActive() &&
    ['EN_ATTENTE', 'NEGOCIATION'].includes(this.reservation.statut)
  );
 
  // VENDOR répond à une contre-offre du CLIENT (statut = CONTRE_PROPOSEE)
  // BUG 2 FIX : 'NEGOCIATION' n'est pas un statut d'offre → 'CONTRE_PROPOSEE'
  peutVendeurRepondreContreOffreClient = computed(() =>
    this.estVendeur() &&
    this.offreActive()?.statut === 'CONTRE_PROPOSEE'
  );
 
  // ACHETEUR répond à l'offre du VENDOR (offre EN_ATTENTE initiée par vendor)
  // BUG 3 FIX : cette zone était dans le bloc estVendeur() par erreur
  peutAcheteurRepondreOffreVendeur = computed(() =>
    this.estAcheteur() &&
    this.offreActive()?.statut === 'EN_ATTENTE'
  );
 
  // ACHETEUR en attente (aucune offre active = le vendor n'a pas encore proposé)
  acheteurEnAttenteOffre = computed(() =>
    this.estAcheteur() && !this.offreActive()
  );
 
  // VENDOR en attente de la réponse du client
  vendeurEnAttenteReponse = computed(() =>
    this.estVendeur() &&
    this.offreActive()?.statut === 'EN_ATTENTE'
  );
 
  // ── Labels / classes ─────────────────────────────────────────────────────
  readonly STATUT_LABELS: Record<OffreStatut, string> = {
    EN_ATTENTE:      'En attente de réponse',
    NEGOCIATION:     'En négociation',
    ACCEPTEE:        'Acceptée',
    REFUSEE:         'Refusée',
    EXPIREE:         'Expirée',
    CONTRE_PROPOSEE: 'Contre-proposition',
  };
 
  readonly STATUT_CLASSES: Record<OffreStatut, string> = {
    EN_ATTENTE:      'badge-pending',
    NEGOCIATION:     'badge-secondary',
    ACCEPTEE:        'badge-success',
    REFUSEE:         'badge-danger',
    EXPIREE:         'badge-muted',
    CONTRE_PROPOSEE: 'badge-warning',
  };
 
  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void { this.chargerOffres(); }
 
  chargerOffres(): void {
    this.loading.set(true);
    this.error.set('');
    this.reservationSvc.getOffres(this.reservation.id).subscribe({
      next:  (data) => { this.offres.set(data); this.loading.set(false); },
      error: (err)  => {
        this.loading.set(false);
        this.error.set(err.error?.detail ?? 'Erreur chargement offres.');
      }
    });
  }
 
  // ══════════════════════════════════════════════════════════════════════════
  // ACTIONS VENDOR
  // ══════════════════════════════════════════════════════════════════════════
 
  /** Vendor envoie son prix de vente au client. */
  faireOffreVendeur(): void {
    const prix = this.prixPropose();
    if (!prix || prix <= 0) {
      this.toast.showError('Saisissez un prix valide (XAF/m²).');
      return;
    }
    this.loadingAction.set(true);
    this.reservationSvc.faireOffre({
      reservation_id: this.reservation.id,
      prix_vendeur:   prix,
    }).subscribe({
      next: (offre) => {
        this.offres.update(list => [offre, ...list]);
        this.success.set('Offre de prix envoyée au client !');
        this.prixPropose.set(null);
        this.loadingAction.set(false);
      },
      error: (err) => {
        this.loadingAction.set(false);
        this.error.set(err.error?.detail ?? 'Erreur envoi offre.')
      }
    });
  }
 
  /** Vendor accepte la contre-offre du client → attribution. */
  vendeurAccepterOffreClient(): void {
    const offre = this.offreActive();
    if (!offre) return;
    this.loadingAction.set(true);
    this.reservationSvc.vendeurAccepter(offre.id).subscribe({
      next: () => {
        this.loadingAction.set(false);
        this.success.set(
          'Offre acceptée ! La parcelle est attribuée. ' +
          'Les autres candidats seront notifiés et remboursés à 40%.'
        );
        setTimeout(() => this.activeModal.close('attribuee'), 2500);
      },
      error: (err) => {
        this.loadingAction.set(false);
        this.error.set(err.error?.detail ?? 'Erreur attribution.');
      }
    });
  }
 
  /** Vendor contre-propose suite à une contre-offre du client. */
  vendeurContreProposer(): void {
    const prix  = this.prixContrePropose();
    const offre = this.offreActive();
    if (!prix || prix <= 0 || !offre) {
      this.error.set('Saisissez un prix de contre-proposition valide.');
      return;
    }
    this.loadingAction.set(true);
    this.reservationSvc.vendeurContreProposer(offre.id, prix).subscribe({
      next: (nouvelleOffre) => {
        this.offres.update(list => [nouvelleOffre, ...list]);
        this.prixContrePropose.set(null);
        this.success.set('Votre nouvelle proposition a été envoyée au client.');
        this.loadingAction.set(false);
      },
      error: (err) => {
        this.loadingAction.set(false);
        this.error.set(err.error?.detail ?? 'Erreur contre-proposition.');
      }
    });
  }
 
  // ══════════════════════════════════════════════════════════════════════════
  // ACTIONS ACHETEUR
  // ══════════════════════════════════════════════════════════════════════════
 
  /** Acheteur accepte l'offre du vendor → attribution. */
  acheteurAccepterOffreVendeur(): void {
    const offre = this.offreActive();
    if (!offre) return;
    this.loadingAction.set(true);
    this.reservationSvc.accepterOffreVendeur(offre.id).subscribe({
      next: () => {
        this.loadingAction.set(false);
        this.success.set('Offre acceptée ! La parcelle vous sera attribuée.');
        this.chargerOffres();
      },
      error: (err) => {
        this.loadingAction.set(false);
        this.error.set(err.error?.detail ?? 'Erreur.');
      }
    });
  }
 
  /** Acheteur fait une contre-proposition au vendor. */
  acheteurContreProposer(): void {
    const prix  = this.prixContrePropose();
    const offre = this.offreActive();
    if (!prix || prix <= 0 || !offre) {
      this.error.set('Saisissez un prix de contre-proposition valide.');
      return;
    }
    this.loadingAction.set(true);
    this.reservationSvc.contreProposer(offre.id, { prix_contre_propose: prix }).subscribe({
      next: (updated) => {
        this._updateOffre(updated);
        this.chargerOffres();
        this.success.set('Votre contre-proposition a été envoyée au vendeur !');
        this.prixContrePropose.set(null);
        this.loadingAction.set(false);
      },
      error: (err) => {
        this.loadingAction.set(false);
        this.error.set(err.error?.detail ?? 'Erreur contre-proposition.');
      }
    });
  }
 
  /** Acheteur refuse la contre-proposition du vendor → re-négociation possible. */
  acheteurRefuserContrePropositionVendeur(): void {
    const offre = this.offreActive();
    if (!offre) return;
    this.loadingAction.set(true);
    this.reservationSvc.refuserContreProposition(offre.id).subscribe({
      next: (updated) => {
        this._updateOffre(updated);
        this.loadingAction.set(false);
        this.success.set(
          'Contre-proposition refusée. Le vendeur peut faire une nouvelle offre.'
        );
      },
      error: (err) => {
        this.loadingAction.set(false);
        this.error.set(err.error?.detail ?? 'Erreur refus.');
      }
    });
  }
 
  // ── Helpers ───────────────────────────────────────────────────────────────
  private _updateOffre(updated: Offre): void {
    this.offres.update(list =>
      list.map(o => o.id === updated.id ? updated : o)
    );
  }
 
  formatPrix(prix: number | string | null | undefined): string {
    if (prix == null) return '—';
    return new Intl.NumberFormat('fr-FR').format(Number(prix)) + ' XAF/m²';
  }
 
  fermer(): void { this.activeModal.dismiss(); }

}
