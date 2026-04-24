import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AnnonceService } from '../../services/annonce.service';
import { AvisService } from '../../services/avis.service';
import { ConversationService } from '../../services/conversation.service';
import { Annonce, StatutAnnonce } from '../../models/annonce.model';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';
import { 
  ConversationCreate 
} from '../../conversation/conversation-create/conversation-create';
import { Subscription } from 'rxjs';
import { Alert } from '../../../alerts/alert/alert';
import { Authentication } from '../../../../auth/core/authentication';
import { RelativeTimePipe } from '../../../../pipe/relative-time.pipe';
import { AnnonceRejetModal } from '../annonce-rejet-modal/annonce-rejet-modal';
import { MonAnnonceEdit } from '../mon-annonce-edit/mon-annonce-edit';
import { Conversation } from '../../models/conversation.model';
import { ConversationList } from '../../conversation/conversation-list/conversation-list';
import { 
  PurchaserConversation 
} from '../../conversation/purchaser-conversation/purchaser-conversation';
import { NewsletterService } from '../../services/newsletter.service';
import { ToastService } from '../../../../services/toast.service';
import { CreditService } from '../../../finance/services/credit';
import { 
  ParcelleActions, 
  ParcelleInfo } from '../../../foncier/parcelle/parcelle-actions/parcelle-actions';
import { 
  QuotaAtteintModal 
} from '../quota-atteint-modal/quota-atteint-modal';
import { 
  CreditInsuffisantModal 
} from '../credit-insuffisant-modal/credit-insuffisant-modal';
import { 
  ParcelleDetailModal 
} from '../../../foncier/parcelle/parcelle-detail/parcelle-detail';

type NiveauAcces = 'visiteur' | 'gratuit' | 'standard' | 'premium' | 'complet' | null;

@Component({
  selector: 'app-annonce-detail',
  imports: [
    CommonModule, RouterModule, Alert, 
    RelativeTimePipe, ConversationList, PurchaserConversation,
    ParcelleActions,
  ],
  templateUrl: './annonce-detail.html',
  styleUrl: './annonce-detail.scss',
  providers: [DatePipe]
})
export class AnnonceDetail implements OnInit, OnDestroy  {

  annonceId!: string;

  private router              = inject(Router);
  private route               = inject(ActivatedRoute);
  private modalService        = inject(NgbModal);
  private datePipe            = inject(DatePipe);
  private subscription        = new Subscription();

  private annonceService      = inject(AnnonceService);
  private auth                = inject(Authentication);
  private avisService         = inject(AvisService);
  private conversationService = inject(ConversationService);
  private confirmation        = inject(ConfirmationService);
  private newsletterSvc       = inject(NewsletterService);
  private creditService       = inject(CreditService);
  private toast               = inject(ToastService);

  annonce       = signal<Annonce | null>(null);
  conversations = signal<Conversation[]>([]);
  isLoading     = signal(true);
  followLoading = signal(false);
  niveauAcces   = signal<NiveauAcces>(null);

  user         = this.auth.currentUserSignal;
  statistiques = this.avisService.statistiques;

  errorMessage   = '';
  successMessage = '';
  responseType: 'success' | 'danger' = 'success';

  get auteurId():      string { return this.annonce()?.auteur ?? ''; }
  get currentUserId(): string { return this.auth.currentUserSignal()?.id ?? ''; }

  statutAuteur = computed(() => this.newsletterSvc.getStatutAuteur(this.auteurId));

  // ── ParcelleInfo pour parcelle-actions ──
  // Ce getter alimente [parcelle]="parcelleInfo" dans le template
  get parcelleInfo(): ParcelleInfo | null {
    const p = this.annonce()?.bien?.parcelle;
    if (!p?.id) return null;
    return {
      id:          p.id,
      numero:      p.numero     ?? '',
      statut:      p.statut     ?? '',
      superficie:  p.superficie,
      lotissement: p.lotissement ? { nom: p.lotissement.nom } : undefined,
    };
  }

  ngOnInit(): void {
    this.annonceId = this.route.snapshot.paramMap.get('id')!;
    this.loadAnnonce();
    if (this.user()) {
      this.loadConversations();
    }
  }

  ngOnDestroy(): void { this.subscription.unsubscribe(); }

  private loadAnnonce(): void {
    this.isLoading.set(true);
    this.errorMessage = '';

    this.subscription.add(
      this.annonceService.getAnnonce(this.annonceId).subscribe({
        next: (annonce) => {
          this.annonce.set(annonce);
          const acces = (annonce as any)._acces;
          this.niveauAcces.set(acces?.niveau ?? 'complet');

          // Forcer refresh solde si débit effectué
          if (acces?.niveau === 'premium' || acces?.niveau === 'standard') {
            this.creditService.getSolde().subscribe();
          }
          if (this.auteurId && this.auteurId !== this.currentUserId) {
            this.newsletterSvc.chargerStatutAuteur(this.auteurId).subscribe();
          }
          this.isLoading.set(false);
        },
        error: (err) => {
          this.isLoading.set(false);
          if (err.status === 429) { this._ouvrirModaleQuota(err.error); return; }
          if (err.status === 402) { 
            this._ouvrirModaleCredits(err.error?.solde ?? 0); return; 
          }
          this.errorMessage = `Erreur chargement (${err.status})`;
          this.responseType = 'danger';
        }
      })
    );
  }

  private loadConversations(): void {
    this.subscription.add(
      this.conversationService.getConversations().subscribe({
        next: (data) => this.conversations.set(data),
        error: () => {}
      })
    );
  }

  private _ouvrirModaleQuota(errData: any): void {
    const ref = this.modalService.open(QuotaAtteintModal, {
      centered: true, size: 'md', backdrop: 'static'
    });
    ref.componentInstance.message = errData?.message ?? 'Quota de consultations atteint.';
    ref.componentInstance.heures = errData?.heures_reset ?? 6;
    ref.componentInstance.estVisiteur = !this.user();
    ref.componentInstance.solde = errData?.solde;
    ref.result.catch(() => this.router.navigate(['/lango/annonces']));
  }

  private _ouvrirModaleCredits(solde: number): void {
    const ref = this.modalService.open(CreditInsuffisantModal, {
      centered: true, size: 'md', backdrop: 'static'
    });
    ref.componentInstance.solde     = solde;
    ref.componentInstance.annonceId = this.annonceId;
    ref.result.then(
      (result) => {
        if (result === 'credits_achetes') {
          this.creditService.getSolde().subscribe();
          this.loadAnnonce();
        }
      },
      () => this.router.navigate(['/lango/annonces'])
    );
  }

  visualisationParcel(): void {
    const modalRef = this.modalService.open(ParcelleDetailModal, {
      size: 'lg',
      backdrop: 'static',
      scrollable: true ,
      centered: true,
      keyboard: false
    });

    const parcel = this.annonce()?.bien?.parcelle;

    if (!parcel) return;

    modalRef.componentInstance.parcelleId = parcel.id;
  }

  // Appelé par (actionEffectuee) dans le template
  onActionPremium(action: string): void {
    this.creditService.getSolde().subscribe();
  }

  // ── Rôles ────────────────────────────────────────────────────────────────
  isVisiteur(): boolean { return !this.user(); }

  isOwner(): boolean {
    const u = this.user(); const a = this.annonce();
    if (!u || !a) return false;
    return a.auteur === u.id || a.auteur_nom === u.username;
  }

  isAdmin():     boolean { return this.auth.hasRole('Admin'); }
  isManager():   boolean { return this.auth.hasRole('Manager'); }
  isVendor():    boolean { return this.auth.hasRole('Vendor'); }
  isPurchaser(): boolean { return this.auth.hasRole('Purchaser') && !this.isOwner(); }

  get peutVoirComplet(): boolean {
    return this.isAdmin() || this.isManager() || this.isOwner()
        || ['premium', 'standard', 'complet'].includes(this.niveauAcces() ?? '');
  }

  get detailLimite(): boolean {
    return this.niveauAcces() === 'visiteur' || this.niveauAcces() === 'gratuit';
  }

  // ── Actions vendor ────────────────────────────────────────────────────────

  async publierVendor(): Promise<void> {
    const ok = await this.confirmation.confirm({
      title: 'Publier votre annonce', type: 'bg-success',
      message: 'Votre annonce sera visible de tous immédiatement.',
      icon: 'bi-check-circle', confirmLabel: 'Publier maintenant', cancelLabel: 'Annuler',
    });
    if (!ok) return;
    this.annonceService.publierVendor(this.annonceId).subscribe({
      next: (a) => { this.successMessage = '✅ Annonce publiée !'; this.annonce.set(a); },
      error: (e) => { 
        this.errorMessage = e.error?.detail ?? 'Erreur publication.'; 
        this.responseType = 'danger'; }
    });
  }

  async mettreEnAttente(): Promise<void> {
    const ok = await this.confirmation.confirm({
      title: 'Soumettre pour validation', type: 'bg-info',
      message: 'L\'annonce sera examinée par notre équipe avant publication.',
      icon: 'bi-clock', confirmLabel: 'Soumettre', cancelLabel: 'Annuler',
    });
    if (!ok) return;
    this.annonceService.mettreEnAttente(this.annonceId).subscribe({
      next: (a) => { 
        this.successMessage = 'Annonce soumise pour validation.'; 
        this.annonce.set(a); 
      },
      error: (e) => { this.errorMessage = e.error?.detail ?? 'Erreur.'; }
    });
  }

  async archiverVendor(): Promise<void> {
    const ok = await this.confirmation.confirm({
      title: 'Archiver l\'annonce', type: 'bg-secondary',
      message: `L\'annonce sera retirée de la liste publique. 
      Une annonce publiée ne peut pas revenir en brouillon.`,
      icon: 'bi-archive', confirmLabel: 'Archiver', cancelLabel: 'Annuler',
    });
    if (!ok) return;
    this.annonceService.archiverAnnonce(this.annonceId).subscribe({
      next: (r) => { 
        this.successMessage = r.message ?? 'Archivée.'; 
        this.annonce.set(r.annonce); },
      error: (e) => { this.errorMessage = e.error?.detail ?? 'Erreur archivage.'; }
    });
  }

  // ── Actions admin ─────────────────────────────────────────────────────────

  async publier(): Promise<void> {
    const ok = await this.confirmation.confirm({
      title: 'Publier l\'annonce', type: 'bg-info',
      message: 'Cette annonce sera immédiatement visible.',
      icon: 'bi-check-circle', confirmLabel: 'Oui, publier', cancelLabel: 'Annuler',
    });
    if (!ok) return;
    this.annonceService.publierAnnonce(this.annonceId).subscribe({
      next: (r) => { this.successMessage = '✅ Publiée.'; this.annonce.set(r.annonce); },
      error: (e) => { this.errorMessage = e.error?.detail ?? 'Erreur.'; }
    });
  }

  onRejectAnnonce(annonce: Annonce): void {
    const ref = this.modalService.open(AnnonceRejetModal, {
      centered: true, size: 'md', backdrop: 'static', keyboard: false
    });
    ref.componentInstance.annonceId = annonce.id;
    ref.componentInstance.annonce   = annonce;
    ref.result.then(
      (motif: string) => this.annonceService.rejeterAnnonce(annonce.id, motif).subscribe({
        next: (r) => { this.successMessage = r.message; this.annonce.set(r.annonce); },
        error: () => { this.errorMessage = 'Erreur rejet.'; }
      }),
      () => {}
    );
  }

  async supprimer(): Promise<void> {
    const ok = await this.confirmation.confirm({
      title: 'Suppression définitive', type: 'bg-danger',
      message: 'Action irréversible.',
      icon: 'bi-trash', confirmLabel: 'Supprimer', cancelLabel: 'Annuler',
    });
    if (!ok) return;
    this.annonceService.deleteAnnonce(this.annonceId).subscribe({
      next: () => this.router.navigate(['/lango/annonces']),
      error: () => { this.errorMessage = 'Erreur suppression.'; }
    });
  }

  // ── Newsletter ────────────────────────────────────────────────────────────
  suivreAuteur(): void {
    this.followLoading.set(true);
    this.newsletterSvc.suivreAuteur(this.auteurId).subscribe({
      next: () => { 
        this.followLoading.set(false); 
        this.toast.showSuccess('Vous suivez cet auteur.'); 
      },
      error: () => this.followLoading.set(false)
    });
  }

  nePlusSuivre(): void {
    this.followLoading.set(true);
    this.newsletterSvc.nePlusSuivreAuteur(this.auteurId).subscribe({
      next: () => { 
        this.followLoading.set(false); 
        this.toast.showInfo('Abonnement annulé.'); 
      },
      error: () => this.followLoading.set(false)
    });
  }

  ouvrirConversation(): void {
    const ref = this.modalService.open(ConversationCreate, { size: 'md', centered: true });
    ref.componentInstance.annonceId   = this.annonceId;
    ref.componentInstance.annonceTitle = this.annonce()?.titre;
    ref.result.then(() => {}, () => {});
  }

  onEditAnnonce(id: string): void {
    const ref = this.modalService.open(MonAnnonceEdit, {
      size: 'lg', backdrop: 'static', centered: true, keyboard: false
    });
    ref.componentInstance.annonceId = id;
    ref.result.then(() => this.loadAnnonce(), () => this.loadAnnonce());
  }

  goBack():              void { this.router.navigate(['/lango/annonces']); }
  clearSuccessMessage(): void { this.successMessage = ''; }
  clearErrorMessage():   void { this.errorMessage = ''; }

  getStatutBadgeClass = (s: StatutAnnonce) => this.annonceService.getStatutBadgeClass(s);
  getStatutLabel      = (s: StatutAnnonce) => this.annonceService.getStatutLabel(s);
  getStars            = (n: number)        => this.avisService.getStars(n);
    
}
