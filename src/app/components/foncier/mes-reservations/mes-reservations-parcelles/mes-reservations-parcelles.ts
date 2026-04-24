import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { RelativeTimePipe } from '../../../../pipe/relative-time.pipe';
import { 
  OffreNegociation, 
  ReservationParcelle, 
  ReservationService 
} from '../../services/reservation';
import { ToastService } from '../../../../services/toast.service';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';

@Component({
  selector: 'app-mes-reservations-parcelles',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbTooltipModule, RelativeTimePipe],
  templateUrl: './mes-reservations-parcelles.html',
  styleUrl: './mes-reservations-parcelles.scss'
})
export class MesReservationsParcelles implements OnInit {

  private reservationSvc = inject(ReservationService);
  private confirmation   = inject(ConfirmationService);
  private toast          = inject(ToastService);
 
  reservations = signal<ReservationParcelle[]>([]);
  loading      = signal(false);
  error        = signal('');
 
  // Offre en cours de réponse
  offreEnCours     = signal<OffreNegociation | null>(null);
  modeReponse      = signal<'accepter' | 'contre' | null>(null);
  prixContreOffre  = 0;
  messageReponse   = '';
  submitting       = signal(false);
 
  // Stats
  stats = computed(() => {
    const r = this.reservations();
    return {
      actives:   r.filter(x => ['EN_ATTENTE','NEGOCIATION'].includes(x.statut)).length,
      attribuees: r.filter(x => x.statut === 'ATTRIBUEE').length,
      rejetees:  r.filter(x => x.statut === 'REJETEE').length,
    };
  });
 
  ngOnInit(): void { this.charger(); }
 
  charger(): void {
    this.loading.set(true);
    this.reservationSvc.getMesReservations().subscribe({
      next:  r => { 
        //this.reservations.set(r); 
        this.loading.set(false); 
      },
      error: () => { this.error.set('Erreur chargement.'); this.loading.set(false); }
    });
  }
 
  // ── Annuler une réservation ───────────────────────────────────────────────
  async annuler(r: ReservationParcelle): Promise<void> {
    const ok = await this.confirmation.confirm({
      title:        'Annuler la réservation',
      type:         'bg-danger',
      message:      `Annuler la réservation de la parcelle ${r.parcelle_numero} ? 
                     Vous serez remboursé à 100%.`,
      icon:         'bi-x-circle',
      confirmLabel: 'Oui, annuler',
      cancelLabel:  'Garder',
    });
    if (!ok) return;
    this.reservationSvc.annulerReservation(r.id).subscribe({
      next:  () => { this.toast.showSuccess('Réservation annulée.'); this.charger(); },
      error: (e) => this.toast.showError(e.error?.detail ?? 'Erreur annulation.')
    });
  }
 
  // ── Répondre à une offre ──────────────────────────────────────────────────
  ouvrirReponse(offre: OffreNegociation, mode: 'accepter' | 'contre'): void {
    this.offreEnCours.set(offre);
    this.modeReponse.set(mode);
    this.prixContreOffre = parseFloat(offre.prix_vendeur);
    this.messageReponse  = '';
  }
 
  fermerReponse(): void {
    this.offreEnCours.set(null);
    this.modeReponse.set(null);
  }
 
  async envoyerReponse(): Promise<void> {
    const offre = this.offreEnCours();
    const mode  = this.modeReponse();
    if (!offre || !mode) return;
 
    this.submitting.set(true);
 
    if (mode === 'accepter') {
      this.reservationSvc.accepterOffre(offre.id).subscribe({
        next: () => {
          this.toast.showSuccess('Offre acceptée — le vendeur va confirmer.');
          this.fermerReponse();
          this.charger();
          this.submitting.set(false);
        },
        error: (e) => {
          this.toast.showError(e.error?.detail ?? 'Erreur.');
          this.submitting.set(false);
        }
      });
    } else {
      if (!this.prixContreOffre || this.prixContreOffre <= 0) {
        this.toast.showError('Veuillez saisir un prix valide.');
        this.submitting.set(false);
        return;
      }
      //this.reservationSvc.contreProposer(
      //  offre.id, this.prixContreOffre
      //).subscribe({
      //  next: () => {
      //    this.toast.showSuccess(`Contre-offre de ${this.prixContreOffre} XAF envoyée.`);
      //    this.fermerReponse();
      //    this.charger();
      //    this.submitting.set(false);
      //  },
      //  error: (e) => {
      //    this.toast.showError(e.error?.detail ?? 'Erreur.');
      //    this.submitting.set(false);
      //  }
      //});
    }
  }
 
  // ── Helpers template ──────────────────────────────────────────────────────
  getOffreActive(r: ReservationParcelle): OffreNegociation | undefined {
    return r.offres?.find(o =>
      ['EN_ATTENTE','ACCEPTEE_CLIENT','CONTRE_PROPOSEE'].includes(o.statut)
    );
  }
 
  statutClass(s: string): string {
    const m: Record<string,string> = {
      EN_ATTENTE:  'badge-en-attente',
      NEGOCIATION: 'badge-negociation',
      ATTRIBUEE:   'badge-attribuee',
      REJETEE:     'badge-rejetee',
      EXPIREE:     'badge-expiree',
      ANNULEE:     'badge-annulee',
    };
    return m[s] ?? '';
  }
 
  statutLabel(s: string): string {
    const m: Record<string,string> = {
      EN_ATTENTE:  'En attente',
      NEGOCIATION: 'Négociation',
      ATTRIBUEE:   'Attribuée ✓',
      REJETEE:     'Rejetée',
      EXPIREE:     'Expirée',
      ANNULEE:     'Annulée',
    };
    return m[s] ?? s;
  }
 
  offreStatutLabel(s: string): string {
    const m: Record<string,string> = {
      EN_ATTENTE:       'Offre reçue',
      ACCEPTEE_CLIENT:  'Vous avez accepté',
      CONTRE_PROPOSEE:  'Contre-offre envoyée',
      ACCEPTEE_VENDEUR: 'Acceptée',
      REJETEE_VENDEUR:  'Rejetée',
      EXPIREE:          'Expirée',
    };
    return m[s] ?? s;
  }

}
