import { CommonModule, isPlatformBrowser } from '@angular/common';
import { 
  Component, inject, 
  OnDestroy, OnInit, PLATFORM_ID, signal 
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { NgbModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { AnnonceService } from '../../services/annonce.service';
import { Authentication } from '../../../../auth/core/authentication';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';
import { AnnonceFilters, AnnonceListItem } from '../../models/annonce.model';
import { AnnonceDetail } from '../annonce-detail/annonce-detail';
import { AnnonceEditModal } from '../annonce-edit-modal/annonce-edit-modal';
import { RelativeTimePipe } from '../../../../pipe/relative-time.pipe';
import { NewsletterService } from '../../services/newsletter.service';
import { TypeAnnonceDetail } from '../../models/newsletter.model';
import { ToastService } from '../../../../services/toast.service';
import { AnnonceFilter } from '../annonce-filter/annonce-filter';

@Component({
  selector: 'app-annonce-list',
  imports: [CommonModule, RouterModule, NgbTooltipModule, 
            RelativeTimePipe, AnnonceFilter
          ],
  templateUrl: './annonce-list.html',
  styleUrl: './annonce-list.scss',
})
export class AnnonceList implements OnInit, OnDestroy {

  public annonces: AnnonceListItem[] = [];
  public isLoading: boolean = true;
  private currentOpenModal: any;

  messageRedirecting: string = '';
  modePreferences = false;
  error        = signal('');
  success      = signal('');

  private subscriptions = new Subscription();

  private readonly router = inject(Router);
  private readonly modalService = inject(NgbModal);
  private platformId = inject(PLATFORM_ID);

  // Services
  private readonly annonceService = inject(AnnonceService);
  protected readonly auth = inject(Authentication);
  private confirmation = inject(ConfirmationService);
  private newsletterSvc = inject(NewsletterService);
  private toast = inject(ToastService);

  statut = this.newsletterSvc.newsletterStatut;  // signal réactif
  wizardOuvert  = signal(false);
  frequenceChoisie = signal<'IMMEDIATE' | 'QUOTIDIEN' | 'HEBDOMADAIRE'>('IMMEDIATE');
  typesChoisis  = signal<string[]>([]);
  typesDisponibles = signal<TypeAnnonceDetail[]>([]);
  isSubmitting  = signal(false);

  filtresActifs = signal<AnnonceFilters>({});

  frequences: { value: 'IMMEDIATE' | 'QUOTIDIEN' | 'HEBDOMADAIRE';
                label: string; icone: string
   } []= [
    { value: 'IMMEDIATE',   label: 'Immédiate',    icone: 'bi-lightning-fill' },
    { value: 'QUOTIDIEN',   label: 'Quotidienne',   icone: 'bi-calendar-day'   },
    { value: 'HEBDOMADAIRE',label: 'Hebdomadaire',  icone: 'bi-calendar-week'  },
  ];

  user = this.auth.currentUserSignal;
  isLoadingAuth = this.auth.isLoadingAuth;

  ngOnInit(): void {
    this.initializeComponent();
    
    if (isPlatformBrowser(this.platformId) && this.user()) {
      this.newsletterSvc.chargerStatutNewsletter()
        //.pipe(takeUntilDestroyed(this.destroyRef))  // ← ajouter partout
        .subscribe();;
    }
  }

  statusMap: { [key: string]: { label: string; class: string } } = {
    DRAFT:   { label: 'Brouillon', class: 'bg-primary' },
    PENDING: { label: 'En attente de validation', class: 'bg-secondary' },
    ARCHIVED:  { label: 'Archivé', class: 'bg-info' },
    PUBLISHED: { label: 'Publié', class: 'bg-success' },
    REJECTED:  { label: 'Rejetée', class: 'bg-danger' }
  };

  getStatusLabel(statut: string): string {
    return this.statusMap[statut]?.label || 'N/A';
  }

  getStatusClass(statut: string): string {
    return this.statusMap[statut]?.class || 'bg-light text-muted';
  }

  /**
   * Initialisation du composant
   */
  private initializeComponent(): void {
    this.subscribeToAnnonces();
  }

  /**
   * Abonnement aux annonces
   */
  private subscribeToAnnonces(filtres?: AnnonceFilters): void {
    this.isLoading = true;

    this.subscriptions.add(
      this.annonceService.getAnnonces(filtres)
      .subscribe({
        next: (data) => {
          this.annonces = Array.isArray(data) ? data : (data as any).results ?? [];
          this.isLoading = false;
        },
        error: (error) => {
          this.handleError(error);
        }
      })
    );
  }

  onFiltresChange(filtres: AnnonceFilters): void {
    this.filtresActifs.set(filtres);
    this.subscribeToAnnonces(filtres);
  }

  toggleType(id: string): void {
    this.typesChoisis.update(ids =>
      ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]
    );
  }

  validerSouscription(): void {
    this.isSubmitting.set(true);

    const payload = {
      frequence: this.frequenceChoisie(),
      types_souhaites: this.typesChoisis(),
    };

    const action$ = this.modePreferences
          ? this.newsletterSvc.mettreAJourPreferences(payload)   // PATCH
          : this.newsletterSvc.souscrire(payload);             // POST

    const msgSucces = this.modePreferences
    ? 'Préférences mises à jour !'
    : 'Abonnement à la newsletter confirmé !';

    action$.subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.annulerWizard();
        this.toast.showSuccess(msgSucces);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.toast.showError('Une erreur est survenue. Veuillez réessayer.');
      }
    });
  }

  async onConfirmerDesabonnement() {

    const confirmed = await this.confirmation.confirm({
      title: 'Confirmation de désabonnement',
      type: 'bg-warning',
      message: `Êtes-vous sûr de vouloir vous désabonner de la newsletter ?`,
      icon: 'bi-bell-slash',
      iconMessageSmall: '⚠️',
      iconMessageBig: '❔',
      confirmLabel: 'Oui, me désabonner',
      cancelLabel: 'Annuler',
    });

    if (!confirmed) return;

    try {
      this.confirmerDesabonnement();
    } finally {
      setTimeout(() => {
        this.modalService.dismissAll();
      }, 3000);
    }

  }

  confirmerDesabonnement(): void {
    this.newsletterSvc.desabonner().subscribe({
      next: () => {
        this.toast.showInfo(
          'Vous êtes désabonné. Vous pouvez vous réabonner à tout moment.'
        );
      },
      error: () => {
        this.toast.showError('Une erreur est survenue lors du désabonnement.');
      }
    });
  }

  annulerWizard(): void {
    this.wizardOuvert.set(false);
    this.modePreferences = false;
    // Remettre à zéro si on était en mode souscription
    if (!this.statut().abonne) {
      this.frequenceChoisie.set('IMMEDIATE');
      this.typesChoisis.set([]);
    }
  }

  ouvrirPreferences(): void {
    const sub = this.statut().subscription;
    if (!sub) return;

    // Pré-remplir avec les valeurs actuelles
    this.frequenceChoisie.set(sub.frequence);
    //this.typesChoisis.set(sub.types_souhaites);
    this.typesChoisis.set([...sub.types_souhaites]);
    this.modePreferences = true;
    this.wizardOuvert.set(true);
  }

  /**
   * Gestion des erreurs
   */
  private handleError(error: any): void {
    this.error.set(`Erreur lors de la mise à jour de l\'annonce: 
                    (message: ${error.statusText})`);
    this.isLoading = false;
  }

  openEditModal(annonceId: string | null = null): void {
    const modalRef = this.modalService.open(AnnonceEditModal, {
      size: 'lg',
      backdrop: 'static',
      centered: true,
      keyboard: false
    });
        
    if (annonceId) {
      modalRef.componentInstance.annonceId = annonceId;
    }
        
    this.currentOpenModal = modalRef;
        
    modalRef.result.then(
      (result) => {
        this.subscribeToAnnonces();
      },
      (reason) => {
        this.subscribeToAnnonces();
      }
    ).finally(() => this.currentOpenModal = null);
  }

  onCreate(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    this.openEditModal(null);
  }
      
  onEdit(annonce: AnnonceListItem, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    this.openEditModal(annonce.id);
  }

  onDetail(annonce: AnnonceListItem): void {
    if (annonce.id) {
      this.router.navigate(['/lango/annonces', annonce.id, 'detail']);
    }
  }

  openDetailModal(annonce: AnnonceListItem): void {
    const modalRef = this.modalService.open(AnnonceDetail, {
      size: 'lg',
      backdrop: 'static',
      centered: true,
      keyboard: false
    });

    modalRef.componentInstance.annonceId = annonce.id;

    modalRef.result.then(
      () => {},
      () => {}
    );
  }

  /**
   * Ouvre une modale de confirmation avant de supprimer une annonce.
   * @param annonceId L'ID de l'annonce à supprimer.
   */
  async onDelete(annonce: AnnonceListItem) {

    const confirmed = await this.confirmation.confirmDelete('cette annonce');

    if (!confirmed) return;

    try {
      this.annonceService.deleteAnnonce(annonce.id).subscribe({
        next: () => {
          this.success.set('🎉 Annonce supprimée avec succès !');
          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
          this.error.set(`❌ Erreur lors de la suppression de l\'annonce: 
                    (message: ${err.statusText})`);
        }
      });
      this.subscribeToAnnonces();
    } finally {
      setTimeout(() => {
        this.modalService.dismissAll();
      }, 3000);
    }
  }

  /**
   * Nettoyage des abonnements
   */
  private cleanupSubscriptions(): void {
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
  }

  isApproved(role: string[]): boolean | null {
    return this.auth.hasAnyRole(role);
  }

  isNotConnect(): boolean {
    return !this.auth.getCurrentUser()
  }

  ngOnDestroy(): void {
    this.cleanupSubscriptions();
  }
}
