import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { 
  Conversation, 
  OffrePrix, 
  RepondreOffrePayload 
} from '../../models/conversation.model';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ConversationService } from '../../services/conversation.service';
import { Authentication } from '../../../../auth/core/authentication';
import { ToastService } from '../../../../services/toast.service';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-conversation-nego',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './conversation-nego.html',
  styleUrl: './conversation-nego.scss'
})
export class ConversationNego implements OnInit {

  @Input() conversation!: Conversation;

  private activeModal   = inject(NgbActiveModal);
  private convSvc       = inject(ConversationService);
  private auth          = inject(Authentication);
  private toast         = inject(ToastService);
  private confirmation  = inject(ConfirmationService);

  offres        = signal<OffrePrix[]>([]);
  loading       = signal(false);
  loadingAction = signal(false);
  error         = signal('');
  success       = signal('');

  prixSaisi     = signal<number | null>(null);
  messageSaisi  = '';
  contrePropose = signal<number | null>(null);
  contreMessage = '';

  user        = this.auth.currentUserSignal;
  estVendeur  = computed(() => this.conversation?.vendor_id   === this.user()?.id);
  estAcheteur = computed(() => this.conversation?.purchaser_id === this.user()?.id);

  offreActive = computed(() =>
    this.offres().find(o => o.statut === 'EN_ATTENTE') ?? null
  );

  peutEnvoyerOffre = computed(() =>
    !this.conversation?.fermee && !this.offreActive()
  );

  peutRepondre = computed(() =>
    !!this.offreActive() &&
    !this.offreActive()!.est_mon_offre &&
    !this.conversation?.fermee
  );

  peutFermer = computed(() =>
    this.estVendeur() && !this.conversation?.fermee
  );

  readonly STATUT_LABELS: Record<string, string> = {
    EN_ATTENTE:      'En attente',
    ACCEPTEE:        '✓ Acceptée',
    REFUSEE:         '✗ Refusée',
    CONTRE_PROPOSEE: 'Contre-proposition',
    EXPIREE:         'Expirée',
  };

  readonly STATUT_CLASSES: Record<string, string> = {
    EN_ATTENTE:      'nego-badge--pending',
    ACCEPTEE:        'nego-badge--success',
    REFUSEE:         'nego-badge--danger',
    CONTRE_PROPOSEE: 'nego-badge--warning',
    EXPIREE:         'nego-badge--muted',
  };

  ngOnInit(): void { this.charger(); }

  charger(): void {
    this.loading.set(true);
    this.error.set('');
    this.convSvc.getOffresPrix(this.conversation.id).subscribe({
      next:  d => { this.offres.set(d); this.loading.set(false); },
      error: e => {
        this.error.set(e.error?.detail ?? 'Erreur chargement.');
        this.loading.set(false);
      }
    });
  }

  envoyerOffre(): void {
    const prix = this.prixSaisi();
    if (!prix || prix <= 0) { this.toast.showError('Prix invalide.'); return; }
    this.loadingAction.set(true);
    this.error.set('');

    this.convSvc.envoyerOffre(this.conversation.id, {
      prix_propose: prix,
      message: this.messageSaisi || undefined,
    }).subscribe({
      next: offre => {
        this.offres.update(l => [offre, ...l]);
        this.prixSaisi.set(null);
        this.messageSaisi = '';
        this.success.set(`Offre de ${prix.toLocaleString('fr-FR')} XAF envoyée.`);
        this.loadingAction.set(false);
      },
      error: e => {
        this.error.set(e.error?.detail ?? 'Erreur envoi.');
        this.loadingAction.set(false);
      }
    });
  }

  async accepterOffre(): Promise<void> {
    const offre = this.offreActive();
    if (!offre) return;
    const ok = await this.confirmation.confirm({
      title:        'Accepter cette offre',
      type:         'bg-success',
      message:      `Confirmer l'accord à 
                      ${offre.prix_propose.toLocaleString('fr-FR')} XAF ? `
                  + `La conversation sera fermée automatiquement.`,
      icon:         'bi-check-circle',
      confirmLabel: 'Oui, accord conclu',
      cancelLabel:  'Annuler',
    });
    if (!ok) return;
    this.loadingAction.set(true);
    this._repondre(offre.id, { action: 'accepter' }, () => {
      this.success.set(`🎉 Accord à ${offre.prix_propose.toLocaleString('fr-FR')} XAF !`);
      setTimeout(() => this.activeModal.close('accord'), 2000);
    });
  }

  refuserOffre(): void {
    const offre = this.offreActive();
    if (!offre) return;
    this.loadingAction.set(true);
    this._repondre(offre.id, { action: 'refuser' }, () => {
      this.success.set('Offre refusée. Faites une nouvelle proposition.');
    });
  }

  contreProposer(): void {
    const offre = this.offreActive();
    const prix  = this.contrePropose();
    if (!offre || !prix || prix <= 0) {
      this.toast.showError('Prix de contre-proposition invalide.');
      return;
    }
    this.loadingAction.set(true);
    this._repondre(offre.id, {
      action:       'contre_proposer',
      nouveau_prix: prix,
      message:      this.contreMessage || undefined,
    }, (data) => {
      this.offres.update(l => [data, ...l]);
      this.contrePropose.set(null);
      this.contreMessage = '';
      this.success.set(`Contre-offre de ${prix.toLocaleString('fr-FR')} XAF envoyée.`);
    });
  }

  async fermerConversation(): Promise<void> {
    const ok = await this.confirmation.confirm({
      title:        'Fermer la conversation',
      type:         'bg-warning',
      message:      'Fermer cette conversation ? L\'acheteur sera notifié.',
      icon:         'bi-x-circle',
      confirmLabel: 'Oui, fermer',
      cancelLabel:  'Annuler',
    });
    if (!ok) return;
    this.loadingAction.set(true);
    this.convSvc.fermerConversation(this.conversation.id).subscribe({
      next: () => {
        this.success.set('Conversation fermée.');
        this.loadingAction.set(false);
        setTimeout(() => this.activeModal.close('fermee'), 1500);
      },
      error: e => {
        this.error.set(e.error?.detail ?? 'Erreur fermeture.');
        this.loadingAction.set(false);
      }
    });
  }

  private _repondre(
    offreId: string,
    payload: RepondreOffrePayload,
    onSuccess: (data?: any) => void
  ): void {
    this.convSvc.repondreOffre(this.conversation.id, offreId, payload).subscribe({
      next: data => {
        this.charger();
        onSuccess(data);
        this.loadingAction.set(false);
      },
      error: e => {
        this.error.set(e.error?.detail ?? 'Erreur réponse.');
        this.loadingAction.set(false);
      }
    });
  }

  formatPrix(p: number | string | null | undefined): string {
    if (p == null) return '—';
    return Number(p).toLocaleString('fr-FR') + ' XAF';
  }

  fermer(): void { this.activeModal.dismiss(); }

}
