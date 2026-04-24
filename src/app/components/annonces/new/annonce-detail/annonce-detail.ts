import { CommonModule } from '@angular/common';
import { Component, computed, HostListener, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ConversationList } from '../../conversation/conversation-list/conversation-list';
import { 
  ParcelleActions, ParcelleInfo 
} from '../../../foncier/parcelle/parcelle-actions/parcelle-actions';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RelativeTimePipe } from '../../../../pipe/relative-time.pipe';
import { 
  PurchaserConversation 
} from '../../conversation/purchaser-conversation/purchaser-conversation';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { AnnonceService } from '../services/annonce-new.service';
import { Authentication } from '../../../../auth/core/authentication';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';
import { CreditService } from '../../../finance/services/credit';
import { ToastService } from '../../../../services/toast.service';
import { AvisService } from '../../services/avis.service';
import { ConversationService } from '../../services/conversation.service';
import { NewsletterService } from '../../services/newsletter.service';
import { 
  AccesMeta, Annonce, 
  NiveauAcces, QuotaError, 
  StatutAnnonce 
} from '../models/annonce-new.model';
import { Conversation } from '../../models/conversation.model';
import { 
  AnnonceRejetModal 
} from '../../my-annoncement/annonce-rejet-modal/annonce-rejet-modal';
import { 
  ConversationCreate 
} from '../../conversation/conversation-create/conversation-create';
import { 
  ParcelleDetailModal 
} from '../../../foncier/parcelle/parcelle-detail/parcelle-detail';
import { MonAnnonceEdit } from '../../my-annoncement/mon-annonce-edit/mon-annonce-edit';
import { 
  ParcellesOnMap 
} from '../../../foncier/parcelle/parcelles-on-map/parcelles-on-map';
import { 
  LotissementService 
} from '../../../foncier/services/lotissement';
import { 
  ParcelleReservationModal 
} from '../../../foncier/mes-reservations/parcelle-reservation-modal/parcelle-reservation-modal';
import { 
  ParcellePourReservation 
} from '../../../foncier/models/reservation-parcelle.model';
import { 
  CreditInsuffisantModal 
} from '../../my-annoncement/credit-insuffisant-modal/credit-insuffisant-modal';
import { 
  QuotaAtteintModal 
} from '../../my-annoncement/quota-atteint-modal/quota-atteint-modal';
import { animate, style, transition, trigger } from '@angular/animations';

interface GallerySlide {
  url: string;
  alt: string;
  caption?: string;
}

@Component({
  selector: 'app-annonce-detail',
  standalone: true,
  imports: [
    CommonModule, RouterModule, RelativeTimePipe,
    ConversationList, PurchaserConversation,
    ParcelleActions,
  ],
  templateUrl: './annonce-detail.html',
  styleUrl: './annonce-detail.scss',
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class AnnonceDetail implements OnInit, OnDestroy {

  annonceId!: string;

  private router              = inject(Router);
  private route               = inject(ActivatedRoute);
  private modalService        = inject(NgbModal);
  private sub                 = new Subscription();

  private annonceService      = inject(AnnonceService);
  private auth                = inject(Authentication);
  private avisService         = inject(AvisService);
  private conversationService = inject(ConversationService);
  private confirmation        = inject(ConfirmationService);
  private newsletterSvc       = inject(NewsletterService);
  private creditSvc           = inject(CreditService);
  private toast               = inject(ToastService);
  private lotissementSvc      = inject(LotissementService);

  // ── État ─────────────────────────────────────────────────────────────────
  annonce       = signal<Annonce | null>(null);
  conversations = signal<Conversation[]>([]);
  isLoading     = signal(true);
  followLoading = signal(false);
  idLotissement!: string;
  nbParcellesLotissement!: number;

  // Bloc _acces retourné par le backend
  acces         = signal<AccesMeta | null>(null);

  // Erreur quota (429) — affiché via QuotaAtteintBanner
  quotaErreur   = signal<QuotaError | null>(null);

  error        = signal('');
  success      = signal('');

  // --- QUOTA MAX ET HEURE ------------------------------
  VISITEUR_QUOTA_MAX = 4 
  VISITEUR_PERIODE_HEURES = 8

  UTILISATEUR_SANS_CREDIT_QUOTA_MAX = 6
  UTILISATEUR_SANS_CREDIT_PERIODE_HEURES = 7

  user         = this.auth.currentUserSignal;
  statistiques = this.avisService.statistiques;

  // Carrousel
  currentSlideIndex = signal(0);
  fullscreenGalleryOpen = signal(false);
  fullscreenSlideIndex = signal(0);
  
  // Touch events
  private touchStartX = 0;
  private touchCurrentX = 0;
  private touchThreshold = 50;

  // ── Getters identité ─────────────────────────────────────────────────────
  get auteurId():      string { return this.annonce()?.auteur_info?.id ?? ''; }
  get currentUserId(): string { return this.auth.currentUserSignal()?.id ?? ''; }

  statutAuteur = computed(() => this.newsletterSvc.getStatutAuteur(this.auteurId));
  conversationsAnnonce = computed(() => {
    return this.conversations()?.filter(conv => conv.annonce_id === this.annonceId);
  });


  // ── Computed rôles (depuis le user local) ────────────────────────────────
  isVisiteur  = computed(() => !this.user());
  isAdmin     = computed(() => this.auth.hasRole('Admin'));
  isManager   = computed(() => this.auth.hasRole('Manager'));
  isVendor    = computed(() => this.auth.hasRole('Vendor'));

  // Propriétaire = auteur de l'annonce courante
  isOwner = computed(() => {
    const u = this.user(); 
    const a = this.annonce();
    if (!u || !a) return false;
    return a.auteur === u.id || a.auteur_nom === u.username;
  });

  // Purchaser = connecté, ni admin/manager, ni propriétaire de CETTE annonce
  isPurchaser = computed(() =>
    !!this.user() && !this.isAdmin() && !this.isManager() && !this.isOwner()
  );

  // ── Computed niveau d'accès (depuis _acces backend) ──────────────────────
  niveau = computed<NiveauAcces>(() => this.acces()?.niveau ?? null);

  // Peut voir le contenu complet et le bloc bien complet
  peutVoirComplet = computed(() =>
    ['standard', 'premium', 
      'complet', 'proprietaire', 'admin'
    ].includes(this.niveau() ?? '')
    //|| this.isAdmin() || this.isManager() || this.isOwner()
  );

  // Accès limité = aperçu uniquement
  detailLimite = computed(() =>
    this.niveau() === 'visiteur' || this.niveau() === 'gratuit'
  );

  // Peut contacter le vendor (depuis le bloc _acces)
  peutContacter = computed(() => {
    if (this.isOwner()) return false;       // pas de contact de soi-même
    if (this.isVisiteur()) return false;    // visiteur ne peut pas contacter
    return this.acces()?.peut_contacter;
  });

  // ── Parcelle info pour parcelle-actions ──────────────────────────────────
  parcelleInfo = computed<ParcelleInfo | null>(() => {
    const p = this.annonce()?.bien?.parcelle;
    if (!p?.id) return null;
    return {
      id:          p.id,
      numero:      p.numero     ?? '',
      statut:      p.statut     ?? '',
      superficie:  p.superficie,
      lotissement: p.lotissement ? { 
        id: p.lotissement.id, 
        nom: p.lotissement.nom 
      } : undefined,
    };
  });

  // Computed - slides de la galerie
  gallerySlides = computed<GallerySlide[]>(() => {
    const slides: GallerySlide[] = [];
    const annonce = this.annonce();
    
    if (!annonce) return slides;
    
    // Image principale de l'annonce
    if (annonce.image_principale) {
      slides.push({
        url: annonce.image_principale,
        alt: annonce.titre,
        caption: 'Image principale'
      });
    }
    
    // Photos du bien
    if (annonce.bien?.photos?.length) {
      for (const photo of annonce.bien.photos) {
        slides.push({
          url: photo.url,
          alt: photo.legende || 'Photo du bien',
          caption: photo.legende || (photo.is_principale ? 'Photo principale' : undefined)
        });
      }
    }
    
    return slides;
  });
  
  totalSlides = computed(() => this.gallerySlides().length);
  
  // Navigation carrousel
  nextSlide(): void {
    if (this.currentSlideIndex() < this.totalSlides() - 1) {
      this.currentSlideIndex.update(i => i + 1);
    }
  }
  
  previousSlide(): void {
    if (this.currentSlideIndex() > 0) {
      this.currentSlideIndex.update(i => i - 1);
    }
  }
  
  goToSlide(index: number): void {
    if (index >= 0 && index < this.totalSlides()) {
      this.currentSlideIndex.set(index);
    }
  }
  
  // Touch handlers
  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0].clientX;
    this.touchCurrentX = this.touchStartX;
  }
  
  onTouchMove(event: TouchEvent): void {
    this.touchCurrentX = event.touches[0].clientX;
  }
  
  onTouchEnd(): void {
    const diff = this.touchStartX - this.touchCurrentX;
    
    if (Math.abs(diff) > this.touchThreshold) {
      if (diff > 0) {
        this.nextSlide();
      } else {
        this.previousSlide();
      }
    }
    
    this.touchStartX = 0;
    this.touchCurrentX = 0;
  }
  
  // Galerie plein écran
  openFullscreenGallery(): void {
    this.fullscreenSlideIndex.set(this.currentSlideIndex());
    this.fullscreenGalleryOpen.set(true);
    document.body.style.overflow = 'hidden';
  }
  
  closeFullscreenGallery(): void {
    this.fullscreenGalleryOpen.set(false);
    document.body.style.overflow = '';
  }
  
  fullscreenNext(): void {
    if (this.fullscreenSlideIndex() < this.gallerySlides().length - 1) {
      this.fullscreenSlideIndex.update(i => i + 1);
    }
  }
  
  fullscreenPrevious(): void {
    if (this.fullscreenSlideIndex() > 0) {
      this.fullscreenSlideIndex.update(i => i - 1);
    }
  }
  
  fullscreenGoTo(index: number): void {
    this.fullscreenSlideIndex.set(index);
  }
  
  // Navigation clavier pour la galerie plein écran
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.fullscreenGalleryOpen()) return;
    
    switch (event.key) {
      case 'ArrowLeft':
        this.fullscreenPrevious();
        break;
      case 'ArrowRight':
        this.fullscreenNext();
        break;
      case 'Escape':
        this.closeFullscreenGallery();
        break;
    }
  }
  
  // Partager
  partager(): void {
    if (navigator.share) {
      navigator.share({
        title: this.annonce()?.titre,
        text: `Découvrez cette annonce : ${this.annonce()?.titre}`,
        url: window.location.href
      });
    } else {
      // Fallback : copier le lien
      navigator.clipboard?.writeText(window.location.href);
      this.success.set('Lien copié dans le presse-papier !');
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.annonceId = this.route.snapshot.paramMap.get('id')!;
    this.loadAnnonce();
    if (this.user()) this.loadConversations();
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  // ── Chargement ────────────────────────────────────────────────────────────
  private loadAnnonce(): void {
    this.isLoading.set(true);
    this.error.set('');
    this.quotaErreur.set(null);

    this.sub.add(
      this.annonceService.getAnnonce(this.annonceId).subscribe({
        next: (annonce) => {
          this.annonce.set(annonce);
          this.idLotissement = this.annonce()?.bien?.parcelle?.lotissement?.id!;

          // Lire le bloc _acces retourné par le backend
          const acces = (annonce as any)._acces as AccesMeta | undefined;
          this.acces.set(acces ?? null);

          // Notifier CreditService si des crédits ont été débités
          if (acces?.credits_debites) {
            this.creditSvc.getSolde().subscribe();
          }

          this.sub.add(
            this.lotissementSvc.getById(this.idLotissement).subscribe({
              next: (data) => {
                this.nbParcellesLotissement = data.parcelles?.length!;
              },
              error: (err) => console.log(`Une erreur est survenue: ${err.error.detail}`)
            })
          );

          // Charger le statut auteur pour le bouton "Suivre"
          if (this.auteurId && this.auteurId !== this.currentUserId) {
            this.newsletterSvc.chargerStatutAuteur(this.auteurId).subscribe();
          }

          this.isLoading.set(false);
        },
        error: (err) => {
          this.isLoading.set(false);

          // 429 = quota atteint → afficher bannière
          if (err.status === 429) {
            this.quotaErreur.set(err.error as QuotaError);
            this._ouvrirModaleQuota(err.error as QuotaError);
            return;
          }
          // 402 = crédit insuffisant (si jamais le backend renvoie ça)
          if (err.status === 402) {
            this._ouvrirModaleCredits(err.error?.solde ?? 0);
            return;
          }
          this.error.set(`Erreur chargement (${err.error?.detail || err.status})`);
        }
      })
    );
  }

  private loadConversations(): void {
    this.sub.add(
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

  // ── Modale crédits insuffisants ───────────────────────────────────────────
  private _ouvrirModaleCredits(errData: any): void {
    const ref = this.modalService.open(CreditInsuffisantModal, {
      centered: true, size: 'md', backdrop: 'static'
    });
    ref.componentInstance.solde     = errData?.solde;
    ref.componentInstance.annonceId = this.annonceId;
    ref.result.then(
      (result) => {
        if (result === 'credits_achetes') {
          this.creditSvc.getSolde().subscribe();
          this.loadAnnonce();
        }
      },
      () => this.router.navigate(['/lango/annonces'])
    );
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
      next: (a) => {
        this.success.set('✅ Annonce publiée !');
        this.annonce.set(a); 
      },
      error: (e) => { 
        this.error.set(`Erreur chargement (${e.error?.detail ?? 'Erreur publication.'})`);
      }
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
        this.success.set('✅ Annonce soumise pour validation.');
        this.annonce.set(a); 
      },
      error: (e) => {
        this.error.set(e.error?.detail ?? 'Erreur.');
      }
    });
  }

  async archiverVendor(): Promise<void> {
    const ok = await this.confirmation.confirm({
      title: 'Archiver l\'annonce', type: 'bg-secondary',
      message: 'L\'annonce sera retirée de la liste publique.',
      icon: 'bi-archive', confirmLabel: 'Archiver', cancelLabel: 'Annuler',
    });
    if (!ok) return;
    this.annonceService.archiverAnnonce(this.annonceId).subscribe({
      next: (r) => { 
        this.success.set(r.message ?? 'Archivée.');
        this.annonce.set(r.annonce); 
      },
      error: (e) => { 
        this.error.set(e.error?.detail ?? 'Erreur archivage.');
      }
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
      next: (r) => { 
        this.success.set(r.message ?? '✅ Annonce Publiée.');
        this.annonce.set(r.annonce); 
      },
      error: (e) => {
        this.error.set(e.error?.detail ?? 'Erreur.'); 
      }
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
        next: (r) => { 
          this.success.set(r.message ?? 'Annonce rejetée.');
          this.annonce.set(r.annonce); 
        },
        error: (e) => {
          this.error.set(e.error?.detail ?? 'Erreur rejet.');
        }
      }),
      () => {}
    );
  }

  async supprimer(): Promise<void> {
    const ok = await this.confirmation.confirm({
      title: 'Suppression définitive', type: 'bg-danger',
      message: 'Action irréversible.', icon: 'bi-trash',
      confirmLabel: 'Supprimer', cancelLabel: 'Annuler',
    });
    if (!ok) return;
    this.annonceService.deleteAnnonce(this.annonceId).subscribe({
      next: () => this.router.navigate(['/lango/annonces']),
      error: (e) => {
        this.error.set(e.error?.detail ?? 'Erreur suppression.');
      }
    });
  }

  // ── Newsletter ────────────────────────────────────────────────────────────
  suivreAuteur():   void {
    if (!this.auteurId) {
      this.toast.showError("Impossible de suivre cet auteur : ID manquant.");
      return;
    }
    this.followLoading.set(true); 
    this.newsletterSvc.suivreAuteur(this.auteurId).subscribe({ 
      next: (data) => { 
        this.followLoading.set(false); 
        this.toast.showSuccess(data.message); 
      }, error: (err) => {
        console.log(`ERROR TYPE: ${err.error?.detail}`);
        this.followLoading.set(false);
      }
    }); 
  }

  nePlusSuivre():   void { 
    this.followLoading.set(true); 
    this.newsletterSvc.nePlusSuivreAuteur(this.auteurId).subscribe({ 
      next: () => { 
        this.followLoading.set(false); 
        this.toast.showInfo('Abonnement annulé.'); 
      }, error: () => this.followLoading.set(false) 
    }); 
  
  }

  // ── Contact vendor ────────────────────────────────────────────────────────
  ouvrirConversation(): void {
    const ref = this.modalService.open(ConversationCreate, { size: 'md', centered: true });
    ref.componentInstance.annonceId    = this.annonceId;
    ref.componentInstance.annonceTitle = this.annonce()?.titre;
    ref.result.then(() => {}, () => {});
  }

  // ── Visualisation parcelle ────────────────────────────────────────────────
  visualisationParcel(): void {
    const parcel = this.annonce()?.bien?.parcelle;
    if (!parcel) return;
    const ref = this.modalService.open(ParcelleDetailModal, {
      size: 'lg', backdrop: 'static', scrollable: true, centered: true, keyboard: false
    });
    ref.componentInstance.parcelleId = parcel.id;
  }

  visualisationLotissement(): void {
    const id_lotissement = this.annonce()?.bien?.parcelle?.lotissement?.id;
    this.router.navigate(['/lango/lotissements/', id_lotissement , 'parcelles']);
  }

  async visualisationMapParcels() {
    
    const parcel = this.annonce()?.bien?.parcelle;

    if (!parcel?.lotissement?.id) {
      this.toast.showError('Lotissement non trouvé pour cette parcelle.');
      return;
    }

    //const ok = await this.confirmation.confirm({
    //  title:        'Voir les parcelles du lotissement',
    //  type:         'bg-success',
    //  message:      'Voir les parcelles du lotissement vous coutera x cr.',
    //  icon:         'bi-calendar-check',
    //  confirmLabel: `Confirmer (10 crédits)`,
    //  cancelLabel:  'Annuler',
    //});
    //if (!ok) return;

    this.toast.showSuccess(`Vous avez été débité de 10 cr. dans votre compte.`);

    const ref = this.modalService.open(ParcellesOnMap, {
      size: 'xl',
      backdrop: 'static',
      scrollable: true,
      centered: true,
      keyboard: false
    });

    // ← passer l'ID du LOTISSEMENT (pas de la parcelle)
    ref.componentInstance.lotissementId_input = parcel.lotissement?.id ?? '';
    ref.componentInstance.annonceId = this.annonceId;

  }

  ouvrirReservation(): void {
   const annonce = this.annonce();
   const parcelle = annonce?.bien?.parcelle;
   if (!parcelle || parcelle.statut !== 'DISPONIBLE') return;

   const parcelles: ParcellePourReservation[] = [{
     id:          parcelle.id,
     numero:      parcelle.numero,
     statut:      parcelle.statut,
     superficie:  parcelle.superficie,
     lotissement: parcelle.lotissement
       ? { id: parcelle.lotissement.id, nom: parcelle.lotissement.nom }
       : undefined,
   }];

   const ref = this.modalService.open(ParcelleReservationModal, {
     size: 'md', centered: true, backdrop: 'static'
   });
   ref.componentInstance.parcelles   = parcelles;
   ref.componentInstance.annonceId   = this.annonceId;
   ref.componentInstance.soldeActuel = this.annonceService.soldeCredits() ?? 0;
   ref.componentInstance.coutUnitaire = 2;  // ou lire depuis TarifAction

   ref.result.then(
     (result) => {
       if (result?.reservations?.length > 0) {
         this.creditSvc.getSolde().subscribe();
         this.loadAnnonce();
       }
     },
     () => {}
   );
 }

  onActionPremium(): void { this.creditSvc.getSolde().subscribe(); }
  onEditAnnonce(id: string): void {
    const ref = this.modalService.open(MonAnnonceEdit, {
      size: 'lg', backdrop: 'static', centered: true, keyboard: false
    });
    ref.componentInstance.annonceId = id;
    ref.result.then(() => this.loadAnnonce(), () => this.loadAnnonce());
  }

  goBack(): void { this.router.navigate(['/lango/annonces']); }

  getStatutBadgeClass = (s: StatutAnnonce) => this.annonceService.getStatutBadgeClass(s);
  getStatutLabel      = (s: StatutAnnonce) => this.annonceService.getStatutLabel(s);
  getStars            = (n: number)        => this.avisService.getStars(n);

}
