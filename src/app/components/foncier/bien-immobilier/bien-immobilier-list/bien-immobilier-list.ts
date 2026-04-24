import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { 
  NgbModal, 
  NgbPaginationModule, 
  NgbTooltipModule 
} from '@ng-bootstrap/ng-bootstrap';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { 
  BIEN_STATUT_BADGE, 
  BIEN_STATUT_LABELS, 
  BienImmobilier, 
  TRANSACTION_LABELS 
} from '../../models/bien-type-immobilier.model';
import { BienImmobilierService } from '../../services/bien-immobilier';
import { BienImmobilierForm } from '../bien-immobilier-form/bien-immobilier-form';
import { CommonModule, DatePipe } from '@angular/common';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-bien-immobilier-list',
  imports: [
    CommonModule, FormsModule, 
    NgbTooltipModule, NgbPaginationModule
  ],
  templateUrl: './bien-immobilier-list.html',
  styleUrl: './bien-immobilier-list.scss',
  providers: [DatePipe]
})
export class BienImmobilierList implements OnInit, OnDestroy {

  private readonly svc = inject(BienImmobilierService);
  private confirmation = inject(ConfirmationService);
  
  private readonly modal  = inject(NgbModal);
  private readonly destroy$ = new Subject<void>();
  private readonly search$  = new Subject<string>();
  private datePipe = inject(DatePipe);

  biens = signal<BienImmobilier[]>([]);
  loading = signal(false);
  error = signal('');
  total = signal(0);
  page = signal(1);
  pageSize  = 10;
  searchQuery = signal('');

  totalPages = computed(() => Math.ceil(this.total() / this.pageSize));

  readonly TRANSACTION_LABELS = TRANSACTION_LABELS;
  readonly STATUT_LABELS      = BIEN_STATUT_LABELS;
  readonly STATUT_BADGE       = BIEN_STATUT_BADGE;

  ngOnInit(): void {
    this.search$.pipe(
      debounceTime(400), 
      distinctUntilChanged(), 
      takeUntil(this.destroy$)
    )
      .subscribe(() => { this.page.set(1); this.load(); });
    this.load();
  }

  ngOnDestroy(): void { 
    this.destroy$.next(); 
    this.destroy$.complete(); 
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.svc.getAll(this.page(), this.searchQuery()).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (res) => { 
        this.biens.set(res); 
        this.total.set(res.length); 
        this.loading.set(false); 
      },
      error: (err) => { 
        this.error.set(`Impossible de charger les biens. ERROR: ${err.error?.detail}`); 
        this.loading.set(false); 
      },
    });
  }

  onSearch(q: string): void { this.searchQuery.set(q); this.search$.next(q); }
  onPageChange(p: number): void { this.page.set(p); this.load(); }

  openCreate(): void {
    const ref = this.modal.open(BienImmobilierForm, { size: 'lg', centered: true });
    ref.result.then(r => { if (r === 'saved') this.load(); }, () => {});
  }

  openEdit(b: BienImmobilier): void {
    const ref = this.modal.open(BienImmobilierForm, { size: 'lg', centered: true });
    ref.componentInstance.bien = b;
    ref.result.then(r => { if (r === 'saved') this.load(); }, () => {});
  }

  async onDelete(b: BienImmobilier) {
  
    const formattedDate = this.datePipe.transform(b.created_at, 'dd/MM/yyyy');
  
    const confirmed = await this.confirmation.confirm({
      title: 'Confirmation',
      type: 'bg-danger',
      message: `Êtes-vous sûr de vouloir supprimer ce bien immobilier ?`,
      icon: 'bi-trash',
      iconMessageSmall: '⚠️',
      iconMessageBig: '❌',
      confirmLabel: 'Oui, supprimer',
      cancelLabel: 'Annuler',
      zonePhraseOne: `Propriétaire du bien immobilier: ${b.proprietaire_nom}`,
      zonePhraseTwo: `Bien immobilier: ${b.type_bien_nom}`,
      zonePhraseThree: `Date de création: ${formattedDate}`
    });
  
    if (!confirmed) return;
  
    try {
      this.confirmDelete(b);
    } finally {
      setTimeout(() => {
        this.modal.dismissAll();
      }, 3000);
    }
  
  }

  confirmDelete(b: BienImmobilier): void {
    this.svc.delete(b.id).pipe(takeUntil(this.destroy$)).subscribe({
      next:  () => this.load(),
      error: () => this.error.set('Suppression impossible.'),
    });
  }

  trackById(_: number, item: BienImmobilier): string { return item.id; }

  getPrincipalPhoto(b: BienImmobilier): string | null {
    return b.photos?.find(p => p.est_principale)?.image
        ?? b.photos?.[0]?.image
        ?? null;
  }
}
