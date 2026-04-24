import { CommonModule } from '@angular/common';
import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CreditsInsuffisantsError, ReservationCreate } from '../../models/reservation-parcelle.model';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ReservationService } from '../../services/reservation';
import { CreditService } from '../../../finance/services/credit';
import { ToastService } from '../../../../services/toast.service';

export interface ParcellePourReservation {
  id:          string;
  numero:      string;
  statut:      string;
  superficie?: number;
  lotissement?: { nom: string; id: string };
}

@Component({
  selector: 'app-parcelle-reservation-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './parcelle-reservation-modal.html',
  styleUrl: './parcelle-reservation-modal.scss'
})
export class ParcelleReservationModal implements OnInit {

  @Input() parcelles:      ParcellePourReservation[] = [];
  @Input() annonceId?:     string;
  @Input() soldeActuel:    number = 0;
  @Input() coutUnitaire:   number = 2;      // crédits par parcelle
 
  private activeModal    = inject(NgbActiveModal);
  private reservationSvc = inject(ReservationService);
  private creditSvc      = inject(CreditService);
  private toast          = inject(ToastService);
 
  // ── État ─────────────────────────────────────────────────────────────────
  selection     = signal<string[]>([]);
  loading       = signal(false);
  erreurCredits = signal<CreditsInsuffisantsError | null>(null);
  erreurs       = signal<{ parcelle_id: string; erreur: string }[]>([]);
 
  // ── Computed ──────────────────────────────────────────────────────────────
  coutTotal  = computed(() => this.selection().length * this.coutUnitaire);
  soldeApres = computed(() => this.soldeActuel - this.coutTotal());
  creditsOk  = computed(() => this.soldeApres() >= 0);
 
  parcellesDisponibles = computed(() =>
    this.parcelles.filter(p => p.statut === 'DISPONIBLE')
  );
 
  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.parcelles = this.parcelles.filter(p => p.statut === 'DISPONIBLE');
  }
 
  // ── Sélection ─────────────────────────────────────────────────────────────
  estSelectionnee(id: string): boolean {
    return this.selection().includes(id);
  }
 
  peutSelectionner(p: ParcellePourReservation): boolean {
    if (this.estSelectionnee(p.id)) return true;
    return this.selection().length < 2;
  }
 
  toggleParcelle(p: ParcellePourReservation): void {
    if (p.statut !== 'DISPONIBLE') return;
    this.selection.update(sel =>
      sel.includes(p.id)
        ? sel.filter(id => id !== p.id)
        : sel.length < 2 ? [...sel, p.id] : sel
    );
    this.erreurCredits.set(null);
    this.erreurs.set([]);
  }
 
  // ── Confirmation ──────────────────────────────────────────────────────────
  confirmer(): void {
    if (this.selection().length === 0 || this.loading() || !this.creditsOk()) return;
 
    this.loading.set(true);
    this.erreurCredits.set(null);
    this.erreurs.set([]);
 
    const payload: ReservationCreate = {
      parcelle_ids:      this.selection(),
      annonce_source_id: this.annonceId,
    };
 
    this.reservationSvc.creerReservation(payload).subscribe({
      next: (resp) => {
        this.loading.set(false);
        if (resp.erreurs?.length > 0) this.erreurs.set(resp.erreurs);
        if (resp.nb_reservations > 0) {
          this.creditSvc.getSolde().subscribe();
          this.toast.showSuccess(
            `${resp.nb_reservations} parcelle(s) réservée(s) ! Le vendeur a été notifié.`
          );
          this.activeModal.close({ reservations: resp.reservations });
        }
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 402) {
          this.erreurCredits.set(err.error as CreditsInsuffisantsError);
        } else if (err.status === 409) {
          this.toast.showError(err.error?.detail ?? 'Quota de réservations atteint (max 2).');
        } else if (err.status === 403) {
          this.toast.showError('Accès refusé. Vérifiez votre connexion.');
        } else {
          this.toast.showError(err.error?.detail ?? 'Erreur lors de la réservation.');
        }
      }
    });
  }
 
  fermer(): void { this.activeModal.dismiss(); }
 
  // ── Formatage ─────────────────────────────────────────────────────────────
  formatSuperficie(m2?: number): string {
    if (!m2) return '—';
    return m2 >= 10000 ? `${(m2 / 10000).toFixed(2)} ha` : `${m2} m²`;
  }

}
