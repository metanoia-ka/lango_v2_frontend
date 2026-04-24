import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { 
  NgbModal, NgbPaginationModule, NgbTooltipModule 
} from '@ng-bootstrap/ng-bootstrap';
import { LotissementService } from '../../services/lotissement';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { Lotissement } from '../../models/lotissement.model';
import { LotissementForm } from '../lotissement-form/lotissement-form';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';
import { TitreFoncierService } from '../../services/titre-foncier';
import { TitreFoncier } from '../../models/titre-foncier.model';

@Component({
  selector: 'app-lotissement-list',
  imports: [CommonModule, RouterLink, FormsModule, 
    NgbTooltipModule, NgbPaginationModule],
  templateUrl: './lotissement-list.html',
  styleUrl: './lotissement-list.scss',
  providers: [DatePipe]
})
export class LotissementList implements OnInit, OnDestroy {

  private readonly svc = inject(LotissementService);
  private confirmation = inject(ConfirmationService);
  
  private readonly modal  = inject(NgbModal);
  private readonly destroy$ = new Subject<void>();
  private readonly search$  = new Subject<string>();
  private datePipe = inject(DatePipe);

  lotissements  = signal<Lotissement[]>([]);
  titresFonciers = signal<TitreFoncier[]>([]);
  loading = signal(false);
  error = signal('');
  total = signal(0);
  page = signal(1);
  pageSize = 10;
  searchQuery   = signal('');

  totalPages = computed(() => Math.ceil(this.total() / this.pageSize));

  ngOnInit(): void {
    this.search$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => { this.page.set(1); this.load(); });

    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.svc.getAll(this.page(), this.searchQuery())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          console.log(res);
          this.lotissements.set(res);
          this.total.set(res.length);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger les lotissements.');
          this.loading.set(false);
        },
      });
  }

  onSearch(q: string): void {
    this.searchQuery.set(q);
    this.search$.next(q);
  }

  onPageChange(p: number): void {
    this.page.set(p);
    this.load();
  }

  openCreate(): void {
    const ref = this.modal.open(LotissementForm, { size: 'lg', centered: true });
    ref.result.then(r => { if (r === 'saved') this.load(); }, () => {});
  }

  openEdit(lot: Lotissement): void {
    const ref = this.modal.open(LotissementForm, { size: 'lg', centered: true });
    ref.componentInstance.lotissement = lot;
    ref.result.then(r => { if (r === 'saved') this.load(); }, () => {});
  }

  async onDelete(lot: Lotissement) {
    
    const formattedDate = this.datePipe.transform(lot.created_at, 'dd/MM/yyyy');
    
    const confirmed = await this.confirmation.confirm({
      title: 'Confirmation',
      type: 'bg-danger',
      message: `Êtes-vous sûr de vouloir supprimer ce lotissement ?
                Cette action est irréversible.`,
      icon: 'bi-trash',
      iconMessageSmall: '⚠️',
      iconMessageBig: '❌',
      confirmLabel: 'Oui, supprimer',
      cancelLabel: 'Annuler',
      zonePhraseOne: `Nom du lotissement: ${lot.nom}`,
      zonePhraseTwo: `Référence du lotissement: ${lot.reference}`,
      zonePhraseThree: `Date de création: ${formattedDate}`,
      requireMotif:  true,
      motifMinLength: 10,
      size: 'lg',
    });
    
    if (!confirmed) return;

    const motif = typeof confirmed === 'string' ? confirmed : 'Suppression demandée';
    
    try {
      this.svc.delete(lot.id, motif).pipe(takeUntil(this.destroy$)).subscribe({
        next:  () => this.load(),
        error: (err) => {
          const msg = err?.error?.detail 
          ?? 'Suppression impossible — ce lotissement est peut-être utilisé.';
          this.error.set(msg);
        },
      });
    } finally {
      setTimeout(() => {
        this.modal.dismissAll();
      }, 3000);
    }
    
  }

  trackById(_: number, item: Lotissement): string { return item.id; }
}
