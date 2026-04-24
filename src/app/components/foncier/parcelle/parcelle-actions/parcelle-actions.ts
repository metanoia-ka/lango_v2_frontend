import { CommonModule } from '@angular/common';
import { 
  Component, 
  EventEmitter, 
  inject, 
  Input, 
  OnInit, 
  Output, 
  signal 
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Authentication } from '../../../../auth/core/authentication';
import { PremiumService } from '../../../finance/services/premium';
import { CreditService } from '../../../finance/services/credit';
import { ToastService } from '../../../../services/toast.service';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';

export interface ParcelleInfo {
  id:       string;
  numero:   string;
  statut:   string;  // DISPONIBLE | RESERVEE | VENDUE | ...
  superficie?: number;
  lotissement?: { nom: string, id?: string };
}

export type ActionPremium =
  | 'fiche_accedee'
  | 'chaine_accedee'
  | 'reservation_creee'
  | 'dossier_commande'
  | 'contact_envoye'
  | 'alerte_activee';

@Component({
  selector: 'app-parcelle-actions',
  imports: [CommonModule, FormsModule, NgbTooltipModule],
  templateUrl: './parcelle-actions.html',
  styleUrl: './parcelle-actions.scss'
})
export class ParcelleActions implements OnInit {

  @Input({ required: true }) parcelle!: ParcelleInfo;
  @Output() actionEffectuee = new EventEmitter<ActionPremium>();

  // État des boutons
  loading = signal<string | null>(null);  // nom de l'action en cours

  // Formulaire contact
  afficherContact = signal(false);
  messageContact  = '';

  // Formulaire notes réservation
  afficherNotes   = signal(false);
  notesReservation = '';

  protected auth        = inject(Authentication);
  private premSvc       = inject(PremiumService);
  private creditService = inject(CreditService);
  private toast         = inject(ToastService);
  private confirmation  = inject(ConfirmationService);

  solde = this.creditService.solde;

  // Tarifs en crédits (mirror des TarifAction Django)
  readonly TARIFS = {
    fiche:       5,
    chaine:      8,
    reservation: 25,
    dossier:     20,
    contact:     15,
    alerte:      3,
  };

  ngOnInit(): void {
    // S'assurer que le solde est à jour
    this.creditService.getSolde().subscribe();
  }

  // ── Consultation fiche ────────────────────────────────────────────────────

  async accederFiche(): Promise<void> {
    const ok = await this._confirmerDebit(
      'Accéder à la fiche complète',
      `Accéder à la fiche complète de la parcelle ${this.parcelle.numero}.`,
      this.TARIFS.fiche,
      'bi-file-earmark-text'
    );
    if (!ok) return;

    this.loading.set('fiche');
    this.premSvc.accederFiche(this.parcelle.id).subscribe({
      next: () => {
        this.loading.set(null);
        this.toast.showSuccess('Accès accordé — fiche complète débloquée.');
        this.actionEffectuee.emit('fiche_accedee');
      },
      error: err => this._handleError(err, 'fiche')
    });
  }

  // ── Chaîne foncière ───────────────────────────────────────────────────────

  async accederChaine(): Promise<void> {
    const ok = await this._confirmerDebit(
      'Accéder à la chaîne foncière',
      `Voir l'historique complet des titres fonciers de la parcelle 
      ${this.parcelle.numero}.`,
      this.TARIFS.chaine,
      'bi-diagram-3'
    );
    if (!ok) return;

    this.loading.set('chaine');
    this.premSvc.accederChaine(this.parcelle.id).subscribe({
      next: () => {
        this.loading.set(null);
        this.toast.showSuccess('Chaîne foncière débloquée.');
        this.actionEffectuee.emit('chaine_accedee');
      },
      error: err => this._handleError(err, 'chaine')
    });
  }

  // ── Réservation ───────────────────────────────────────────────────────────

  async reserver(): Promise<void> {
    if (this.parcelle.statut !== 'DISPONIBLE') {
      this.toast.showError('Cette parcelle n\'est pas disponible à la réservation.');
      return;
    }

    const ok = await this._confirmerDebit(
      'Réserver la parcelle',
      `Réserver exclusivement la parcelle ${this.parcelle.numero} pendant 7 jours. 
       Elle sera retirée de la carte publique pendant cette période.`,
      this.TARIFS.reservation,
      'bi-calendar-check'
    );
    if (!ok) return;

    this.loading.set('reservation');
    this.premSvc.reserver({
      parcelle_id: this.parcelle.id,
      notes:       this.notesReservation,
    }).subscribe({
      next: (r) => {
        this.loading.set(null);
        this.afficherNotes.set(false);
        this.notesReservation = '';
        this.toast.showSuccess(
          `Parcelle réservée ! Expire dans ${r.heures_restantes}h.`
        );
        this.actionEffectuee.emit('reservation_creee');
      },
      error: err => this._handleError(err, 'reservation')
    });
  }

  // ── Dossier foncier ───────────────────────────────────────────────────────

  async commanderDossier(): Promise<void> {
    const ok = await this._confirmerDebit(
      'Commander un dossier foncier',
      `Obtenir le dossier complet de la parcelle ${this.parcelle.numero} : 
       fiche, chaîne foncière, historique et PDF horodaté valable 30 jours.`,
      this.TARIFS.dossier,
      'bi-folder2-open'
    );
    if (!ok) return;

    this.loading.set('dossier');
    this.premSvc.commanderDossier(this.parcelle.id).subscribe({
      next: () => {
        this.loading.set(null);
        this.toast.showSuccess(
          'Dossier commandé ! Il sera disponible dans quelques instants.'
        );
        this.actionEffectuee.emit('dossier_commande');
      },
      error: err => this._handleError(err, 'dossier')
    });
  }

  // ── Contact propriétaire ──────────────────────────────────────────────────

  async envoyerContact(): Promise<void> {
    if (!this.messageContact.trim() || this.messageContact.trim().length < 20) {
      this.toast.showError('Le message doit contenir au moins 20 caractères.');
      return;
    }

    const ok = await this._confirmerDebit(
      'Contacter le propriétaire',
      `Votre message sera transmis au propriétaire de la parcelle ${this.parcelle.numero} 
       après modération (sous 72h). Remboursement partiel de 10 crédits si refus.`,
      this.TARIFS.contact,
      'bi-chat-dots'
    );
    if (!ok) return;

    this.loading.set('contact');
    this.premSvc.envoyerContact({
      parcelle_id: this.parcelle.id,
      message:     this.messageContact,
    }).subscribe({
      next: () => {
        this.loading.set(null);
        this.afficherContact.set(false);
        this.messageContact = '';
        this.toast.showSuccess(
          'Demande envoyée — vous serez notifié dès qu\'elle est transmise.'
        );
        this.actionEffectuee.emit('contact_envoye');
      },
      error: err => this._handleError(err, 'contact')
    });
  }

  // ── Alerte disponibilité ──────────────────────────────────────────────────

  async activerAlerte(): Promise<void> {
    const ok = await this._confirmerDebit(
      'Activer une alerte',
      `Être notifié dès que la parcelle ${this.parcelle.numero} 
       repasse en statut DISPONIBLE.`,
      this.TARIFS.alerte,
      'bi-bell'
    );
    if (!ok) return;

    this.loading.set('alerte');
    this.premSvc.activerAlerte({
      type_cible:  'PARCELLE',
      parcelle_id: this.parcelle.id,
    }).subscribe({
      next: () => {
        this.loading.set(null);
        this.toast.showSuccess('Alerte activée — vous serez notifié dès disponibilité.');
        this.actionEffectuee.emit('alerte_activee');
      },
      error: err => this._handleError(err, 'alerte')
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  get estDisponible(): boolean {
    return this.parcelle.statut === 'DISPONIBLE';
  }

  get estConnecte(): boolean {
    return !!this.auth.currentUserSignal();
  }

  soldeSuffisant(cout: number): boolean {
    return this.solde() >= cout;
  }

  private async _confirmerDebit(
    titre:    string,
    message:  string,
    cout:     number,
    icon:     string = 'bi-check2-circle'
  ): Promise<string | boolean> {
    if (!this.soldeSuffisant(cout)) {
      this.toast.showError(
        `Solde insuffisant (${this.solde()} cr.). ${cout} crédits requis.`
      );
      return false;
    }

    return this.confirmation.confirm({
      title:        titre,
      type:         'bg-success',
      message:      `${message}\n\nCoût : 
                     ${cout} crédits — Solde actuel : ${this.solde()} cr.`,
      icon: 'bi-check2-circle',
      confirmLabel: `Confirmer (${cout} cr.)`,
      cancelLabel:  'Annuler',
    });
  }

  private _handleError(err: any, action: string): void {
    this.loading.set(null);
    const detail = err.error?.detail ?? 'Erreur lors de l\'action.';

    if (err.status === 402) {
      this.toast.showError(`Crédits insuffisants. ${detail}`);
    } else if (err.status === 400) {
      this.toast.showError(detail);
    } else {
      this.toast.showError(`Erreur (${err.status}) : ${detail}`);
    }
  }

}
