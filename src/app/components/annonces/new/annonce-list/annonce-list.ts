import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component, computed, ElementRef, inject, OnDestroy, OnInit,
  PLATFORM_ID, signal,
  ViewChild
} from '@angular/core';
import { RelativeTimePipe } from '../../../../pipe/relative-time.pipe';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { 
  NgbModal, 
  NgbTooltipModule, 
  NgbPaginationModule 
} from '@ng-bootstrap/ng-bootstrap';
import { AnnonceFilter } from '../../my-annoncement/annonce-filter/annonce-filter';
import { Subject, takeUntil } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { AnnonceService } from '../services/annonce-new.service';
import { Authentication } from '../../../../auth/core/authentication';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';
import { ToastService } from '../../../../services/toast.service';
import { NewsletterService } from '../../services/newsletter.service';
import { AnnonceListItem, StatutAnnonce } from '../models/annonce-new.model';
import { 
  AnnonceEditModal 
} from '../../my-annoncement/annonce-edit-modal/annonce-edit-modal';
import { CreditService } from '../../../finance/services/credit';
import { TRANSACTION_LABELS } from '../../../foncier/models/bien-type-immobilier.model';
import { AnnonceFilters } from '../../models/annonce.model';
import { AnnonceSearchModal } from '../annonce-search-modal/annonce-search-modal';

// ── Taille de page ────────────────────────────────────────────────────────────
const PAGE_SIZE = 12;
const SCROLL_TOP  = 300;  // px défilés avant d'afficher le bouton "↑ Haut"

@Component({
  selector: 'app-annonce-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, NgbTooltipModule, NgbPaginationModule,
    RelativeTimePipe, AnnonceFilter, FormsModule,
  ],
  templateUrl: './annonce-list.html',
  styleUrl:    './annonce-list.scss'
})
export class AnnonceList implements AfterViewInit, OnInit, OnDestroy {

  // ── Sentinelle IntersectionObserver ───────────────────────────────────────
  @ViewChild('scrollSentinelle') sentinelleRef!: ElementRef;

  private router      = inject(Router);
  private route       = inject(ActivatedRoute);
  private modal       = inject(NgbModal);
  private platformId  = inject(PLATFORM_ID);
  private destroy$    = new Subject<void>();

  readonly annonceSvc   = inject(AnnonceService);
  private creditSvc     = inject(CreditService);
  readonly auth         = inject(Authentication);
  private confirmation  = inject(ConfirmationService);
  private newsletterSvc = inject(NewsletterService);
  private toast         = inject(ToastService);

  // ── Signals depuis services ───────────────────────────────────────────────
  viewsLeft    = this.annonceSvc.viewsLeft;
  viewsMax     = this.annonceSvc.viewsMax;
  quotaPercent = this.annonceSvc.quotaPercent;
  quotaAtteint = this.annonceSvc.quotaAtteint;
  user         = this.auth.currentUserSignal;
  solde        = this.creditSvc.solde;
  isLoadingAuth= this.auth.isLoadingAuth;

  // ── État infinite scroll ───────────────────────────────────────────────────
  annonces         = signal<AnnonceListItem[]>([]);   // liste accumulée
  isLoading        = signal(false);                   // chargement en cours
  isLoadingMore    = signal(false);                   // batch suivant
  pageActuelle     = signal(1);
  totalDisponible  = signal(0);                       // total backend
  plusDePages      = signal(true);                    // false quand tout est chargé
  filtresActifs    = signal<AnnonceFilters>({});
  error            = signal('');
  success          = signal('');

  // ── Navigation verticale ──────────────────────────────────────────────────
  afficherBoutonHaut    = signal(false);  // visible après SCROLL_TOP px
  positionRetour        = signal(0);      // Y sauvegardé avant de cliquer sur un détail
  afficherBoutonRetour  = signal(false);  // après navigation vers détail

  // Remise en attente (admin/manager)
  motifRemise      = signal('');
  annonceEnRemise  = signal<AnnonceListItem | null>(null);

  // ── IntersectionObserver ──────────────────────────────────────────────────
  private observer!: IntersectionObserver;

  // ── Computed ──────────────────────────────────────────────────────────────
  isAdmin    = computed(() => this.auth.hasRole('Admin'));
  isManager  = computed(() => this.auth.hasRole('Manager'));
  isVendor   = computed(() => this.auth.hasRole('Vendor'));
  isConnecte = computed(() => !!this.user());

  afficherQuota = computed(() =>
    this.isConnecte() && !this.isAdmin() && !this.isManager()
    && this.viewsLeft() !== null
  );

  aFiltresActifs = computed(() =>
    Object.values(this.filtresActifs()).some(
      v => v !== undefined && v !== '' && v !== null && v !== false
    )
  );

  nbCharges  = computed(() => this.annonces().length);
  restantes  = computed(() =>
    Math.max(0, this.totalDisponible() - this.nbCharges())
  );

  readonly TRANSACTION_LABELS = TRANSACTION_LABELS;

  readonly statusMap: Record<string, { label: string; classe: string }> = {
    DRAFT:     { label: 'Brouillon',  classe: 'statut--draft'     },
    PENDING:   { label: 'En attente', classe: 'statut--pending'   },
    PUBLISHED: { label: 'Publié',     classe: 'statut--published' },
    ARCHIVED:  { label: 'Archivé',    classe: 'statut--archived'  },
    REJECTED:  { label: 'Rejeté',     classe: 'statut--rejected'  },
  };

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this._ecouterScroll();

      // Restaurer la position si l'utilisateur revient du détail
      const pos = sessionStorage.getItem('annonce_list_scroll');
      if (pos) {
        this.positionRetour.set(parseInt(pos));
        this.afficherBoutonRetour.set(true);
      }
    }

    const hasParams = Object.keys(this.route.snapshot.queryParams).length > 0;
    if (!hasParams) {
      setTimeout(() => this._ouvrirModaleRecherche(), 2500);
      this._chargerBatch(1, true);
    } else {
      this._chargerBatch(1, true);
    }

    if (isPlatformBrowser(this.platformId) && this.user()) {
      this.newsletterSvc.chargerStatutNewsletter().subscribe();
    }
    this._loadSolde();
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this._initIntersectionObserver();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.observer?.disconnect();
    window.removeEventListener('scroll', this._onScroll);
  }

  // ── IntersectionObserver — sentinelle en bas de liste ─────────────────────

  private _initIntersectionObserver(): void {
    if (!this.sentinelleRef) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // Déclencher uniquement si sentinelle visible ET pas déjà en chargement
        if (entry.isIntersecting && this.plusDePages() && !this.isLoadingMore()) {
          this._chargerBatch(this.pageActuelle() + 1, false);
        }
      },
      { threshold: 0.1 }   // déclenche dès 10% visible
    );

    this.observer.observe(this.sentinelleRef.nativeElement);
  }

  // ── Scroll — bouton "↑ Haut" ──────────────────────────────────────────────

  private _onScroll = () => {
    this.afficherBoutonHaut.set(window.scrollY > SCROLL_TOP);
  };

  private _ecouterScroll(): void {
    window.addEventListener('scroll', this._onScroll, { passive: true });
  }

  // ── Chargement des batches ────────────────────────────────────────────────

  private _chargerBatch(page: number, reset: boolean): void {
    if (reset) {
      this.isLoading.set(true);
      this.annonces.set([]);
      this.pageActuelle.set(1);
      this.plusDePages.set(true);
    } else {
      if (this.isLoadingMore() || !this.plusDePages()) return;
      this.isLoadingMore.set(true);
    }

    const filtres = { ...this.filtresActifs(), page, page_size: PAGE_SIZE };

    this.annonceSvc.getAnnonces(filtres)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const items: AnnonceListItem[] = Array.isArray(res)
            ? res
            : (res?.results ?? []);
          const total: number = res?.count ?? items.length;

          if (reset) {
            this.annonces.set(items);
          } else {
            // Ajouter à la liste existante (append)
            this.annonces.update(l => [...l, ...items]);
          }

          this.totalDisponible.set(total);
          this.pageActuelle.set(page);

          // Détecter s'il reste des pages
          const charges = reset ? items.length : this.annonces().length;
          this.plusDePages.set(charges < total);

          this.isLoading.set(false);
          this.isLoadingMore.set(false);
        },
        error: (err) => {
          this.error.set(`Erreur chargement (${err.status})`);
          this.isLoading.set(false);
          this.isLoadingMore.set(false);
        }
      });
  }

  // ── API publique ──────────────────────────────────────────────────────────

  onFiltresChange(filtres: AnnonceFilters): void {
    this.filtresActifs.set(filtres);
    this._chargerBatch(1, true);   // repart de zéro
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  chargerPlus(): void {
    if (!this.plusDePages() || this.isLoadingMore()) return;
    this._chargerBatch(this.pageActuelle() + 1, false);
  }

  effacerFiltres(): void {
    this.filtresActifs.set({});
    this._chargerBatch(1, true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Navigation verticale ──────────────────────────────────────────────────

  scrollHaut(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  scrollRetour(): void {
    const pos = this.positionRetour();
    window.scrollTo({ top: pos, behavior: 'smooth' });
    this.afficherBoutonRetour.set(false);
    sessionStorage.removeItem('annonce_list_scroll');
  }

  // ── Navigation vers le détail ─────────────────────────────────────────────

  onDetail(annonce: AnnonceListItem): void {
    // Sauvegarder la position actuelle avant de partir
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem('annonce_list_scroll', String(window.scrollY));
    }
    this.router.navigate(['/lango/annonces', annonce.id, 'detail']);
  }

  // ── Modale de recherche ───────────────────────────────────────────────────

  private _ouvrirModaleRecherche(): void {
    const ref = this.modal.open(AnnonceSearchModal, {
      size: 'lg', centered: true, backdrop: 'static', keyboard: false,
    });
    ref.result.then(
      (filters: AnnonceFilters) => {
        this.filtresActifs.set(filters);
        this._chargerBatch(1, true);
      },
      () => {}
    );
  }

  private _loadSolde(): void {
    this.auth.currentUser$.subscribe(user => {
      if (user) this.creditSvc.getSolde().subscribe();
      else this.creditSvc.solde.set(0);
    });
  }

  // ── Édition / suppression ─────────────────────────────────────────────────

  openEditModal(annonceId: string | null = null): void {
    const ref = this.modal.open(AnnonceEditModal, {
      size: 'lg', backdrop: 'static', centered: true, keyboard: false
    });
    if (annonceId) ref.componentInstance.annonceId = annonceId;
    ref.result.then(
      (r) => { if (r === 'saved') this._chargerBatch(1, true); },
      () => {}
    );
  }

  onCreate(e?: Event): void { e?.preventDefault(); e?.stopPropagation(); this.openEditModal(null); }
  onEdit(a: AnnonceListItem, e?: Event): void { e?.preventDefault(); e?.stopPropagation(); this.openEditModal(a.id); }

  async onDelete(a: AnnonceListItem): Promise<void> {
    const ok = await this.confirmation.confirmDelete('cette annonce');
    if (!ok) return;
    this.annonceSvc.deleteAnnonce(a.id).subscribe({
      next: () => {
        // Retirer localement sans recharger toute la liste
        this.annonces.update(l => l.filter(x => x.id !== a.id));
        this.totalDisponible.update(n => Math.max(0, n - 1));
        this.success.set('Annonce supprimée.');
        setTimeout(() => this.success.set(''), 3000);
      },
      error: (err) => this.error.set(`Erreur suppression (${err.status})`)
    });
  }

  // ── Remise en attente ─────────────────────────────────────────────────────

  ouvrirRemise(a: AnnonceListItem, e: Event): void {
    e.stopPropagation();
    this.annonceEnRemise.set(a);
    this.motifRemise.set('');
  }
  fermerRemise(): void { this.annonceEnRemise.set(null); }

  confirmerRemise(): void {
    const a = this.annonceEnRemise();
    if (!a) return;
    const motif = this.motifRemise().trim();
    if (motif.length < 10) {
      this.toast.showError('Le motif doit contenir au moins 10 caractères.');
      return;
    }
    this.annonceSvc.remettreEnAttente(a.id, motif).subscribe({
      next: (r) => {
        this.toast.showSuccess(r.detail);
        this.annonces.update(l =>
          l.map(x => x.id === a.id ? { ...x, statut: 'PENDING' as StatutAnnonce } : x)
        );
        this.fermerRemise();
      },
      error: (e) => this.toast.showError(e.error?.detail ?? 'Erreur.')
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  getStatusLabel(s: string): string { return this.statusMap[s]?.label  ?? s; }
  getStatusClass(s: string): string { return this.statusMap[s]?.classe ?? ''; }
  getStatutBadge = (s: StatutAnnonce) => this.annonceSvc.getStatutBadgeClass(s);

  getPhotoUrl(a: AnnonceListItem): string | null {
    if (a.image_principale) return a.image_principale;
    if ((a.bien as any)?.photo_principale) return (a.bien as any).photo_principale;
    return a.bien?.photos?.[0]?.url ?? null;
  }

  getVilleLabel(a: AnnonceListItem): string {
    return (a.bien as any)?.ville_label || a.bien?.localisation_approx || '';
  }

  getCategorieLabel(a: AnnonceListItem): string {
    return (a.bien as any)?.type_bien_categorie || '';
  }

  formatPrix(a: AnnonceListItem): string {
    if (!a.prix) return '—';
    const n  = parseFloat(String(a.prix)).toLocaleString('fr-FR');
    const tx = a.bien?.type_transaction;
    const u  = tx === 'LOCATION' ? 'FCFA/mois' : tx === 'VENTE' ? 'FCFA/m²' : 'FCFA';
    return `${n} ${u}`;
  }

  // Générer un tableau de N éléments pour les skeletons
  readonly skeletons = Array(PAGE_SIZE).fill(0);

}
