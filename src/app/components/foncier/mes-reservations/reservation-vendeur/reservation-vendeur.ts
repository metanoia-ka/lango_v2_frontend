import { Component as VendeurComponent, inject as vinject, OnInit as VOnInit,
         signal as vsignal, computed as vcomputed } from '@angular/core';
import { CommonModule as VCommonModule } from '@angular/common';
import { FormsModule as VFormsModule } from '@angular/forms';
import { NgbTooltipModule as VNgbTooltip } from '@ng-bootstrap/ng-bootstrap';
import { ReservationService as VReservationService } from '../../services/reservation';
import { ConfirmationService as VConfirmationService } from '../../../confirmation-modal/service/confirmation';
import { ToastService as VToastService } from '../../../../services/toast.service';
import { RelativeTimePipe as VRelTimePipe } from '../../../../pipe/relative-time.pipe';


const STATUT_FILTRE = ['', 'EN_ATTENTE', 'NEGOCIATION', 'ATTRIBUEE', 'REJETEE', 'EXPIREE'];

@VendeurComponent({
  selector: 'app-reservation-vendeur',
  standalone: true,
  imports: [VCommonModule, VFormsModule, VNgbTooltip, VRelTimePipe],
  templateUrl: './reservation-vendeur.html',
  styleUrl: './reservation-vendeur.scss'
})
export class ReservationVendeur implements VOnInit {

  private reservationSvc = vinject(VReservationService);
  private confirmation   = vinject(VConfirmationService);
  private toast          = vinject(VToastService);
 
  reservations   = vsignal<any[]>([]);
  loading        = vsignal(false);
  error          = vsignal('');
  statutFiltre   = vsignal('');
  readonly STATUTS = STATUT_FILTRE;
 
  // Formulaire offre inline
  reservationActive = vsignal<any>(null);
  prixVendeur       = 0;
  typePrix          = 'PAR_M2';
  messageVendeur    = '';
  submittingOffre   = vsignal(false);
 
  stats = vcomputed(() => {
    const r = this.reservations();
    return {
      total:       r.length,
      en_attente:  r.filter(x => x.statut === 'EN_ATTENTE').length,
      negociation: r.filter(x => x.statut === 'NEGOCIATION').length,
      attribuees:  r.filter(x => x.statut === 'ATTRIBUEE').length,
    };
  });
 
  ngOnInit(): void { this.charger(); }
 
  charger(): void {
    this.loading.set(true);
    this.reservationSvc.getMesParcelles(this.statutFiltre() || undefined).subscribe({
      next:  r => { this.reservations.set(r); this.loading.set(false); },
      error: () => { this.error.set('Erreur chargement.'); this.loading.set(false); }
    });
  }
 
  onFiltreChange(s: string): void {
    this.statutFiltre.set(s);
    this.charger();
  }
 
  // ── Ouvrir formulaire offre ───────────────────────────────────────────────
  ouvrirOffre(r: any): void {
    this.reservationActive.set(r);
    this.prixVendeur     = 0;
    this.typePrix        = 'PAR_M2';
    this.messageVendeur  = '';
  }
 
  fermerOffre(): void { this.reservationActive.set(null); }
 
  async envoyerOffre(): Promise<void> {
    if (!this.prixVendeur || this.prixVendeur <= 0) {
      this.toast.showError('Veuillez saisir un prix valide.');
      return;
    }
    const r = this.reservationActive();
    if (!r) return;
 
    this.submittingOffre.set(true);
    this.reservationSvc.creerOffre(
      r.id, this.prixVendeur, this.typePrix, this.messageVendeur
    ).subscribe({
      next: () => {
        this.toast.showSuccess(`Offre de ${this.prixVendeur} XAF/${this.typePrix} envoyée.`);
        this.fermerOffre();
        this.charger();
        this.submittingOffre.set(false);
      },
      error: (e) => {
        this.toast.showError(e.error?.detail ?? 'Erreur envoi offre.');
        this.submittingOffre.set(false);
      }
    });
  }
 
  // ── Accepter / Rejeter une offre (réponse du vendeur) ────────────────────
  async vendeurAccepter(offre: any): Promise<void> {
    const ok = await this.confirmation.confirm({
      title:        'Confirmer l\'acceptation',
      type:         'bg-success',
      message:      `Accepter le prix de ${offre.prix_client ?? offre.prix_vendeur} XAF ? La parcelle sera attribuée automatiquement.`,
      icon:         'bi-check-circle',
      confirmLabel: 'Oui, attribuer',
      cancelLabel:  'Annuler',
    });
    if (!ok) return;
 
    this.reservationSvc.vendeurAccepter(offre.id).subscribe({
      next: (res) => {
        this.toast.showSuccess(`Parcelle attribuée au prix de ${res.prix_final} XAF.`);
        this.charger();
      },
      error: (e) => this.toast.showError(e.error?.detail ?? 'Erreur.')
    });
  }
 
  async vendeurRejeter(offre: any): Promise<void> {
    const ok = await this.confirmation.confirm({
      title:        'Rejeter l\'offre',
      type:         'bg-danger',
      message:      'Rejeter cette offre ? 35% des crédits du client seront remboursés.',
      icon:         'bi-x-circle',
      confirmLabel: 'Oui, rejeter',
      cancelLabel:  'Annuler',
    });
    if (!ok) return;
 
    this.reservationSvc.vendeurRejeter(offre.id, '').subscribe({
      next: () => { this.toast.showSuccess('Offre rejetée.'); this.charger(); },
      error: (e) => this.toast.showError(e.error?.detail ?? 'Erreur.')
    });
  }
 
  getOffreActive(r: any): any {
    return r.offres?.find((o: any) =>
      ['EN_ATTENTE','ACCEPTEE_CLIENT','CONTRE_PROPOSEE'].includes(o.statut)
    );
  }
 
  statutClass(s: string): string {
    const m: Record<string,string> = {
      EN_ATTENTE:  'badge-en-attente', NEGOCIATION: 'badge-negociation',
      ATTRIBUEE:   'badge-attribuee',  REJETEE:     'badge-rejetee',
      EXPIREE:     'badge-expiree',    ANNULEE:     'badge-annulee',
    };
    return m[s] ?? '';
  }
 
  statutLabel(s: string): string {
    const m: Record<string,string> = {
      EN_ATTENTE: 'En attente', NEGOCIATION: 'Négociation',
      ATTRIBUEE: 'Attribuée ✓', REJETEE: 'Rejetée', EXPIREE: 'Expirée',
    };
    return m[s] ?? s;
  }

}
