import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { 
  NgbModal, 
  NgbPaginationModule, 
  NgbTooltipModule 
} from '@ng-bootstrap/ng-bootstrap';
import { TitreFoncierService } from '../../services/titre-foncier';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { 
  STATUS_BADGE, 
  STATUS_LABELS, 
  TitreFoncier 
} from '../../models/titre-foncier.model';
import { TitreFoncierForm } from '../titre-foncier-form/titre-foncier-form';
import { 
  TitreFoncierVerification 
} from '../titre-foncier-verification/titre-foncier-verification';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';

@Component({
  selector: 'app-titre-foncier-list',
  imports: [
    CommonModule, RouterModule, FormsModule,
    NgbTooltipModule, NgbPaginationModule
  ],
  templateUrl: './titre-foncier-list.html',
  styleUrl: './titre-foncier-list.scss',
  providers: [DatePipe]
})
export class TitreFoncierList implements OnInit, OnDestroy {

  private readonly svc = inject(TitreFoncierService);
  private confirmation = inject(ConfirmationService);
  
  private readonly modal = inject(NgbModal);
  private readonly destroy$ = new Subject<void>();
  private readonly search$ = new Subject<string>();
  private datePipe = inject(DatePipe);

  // ── State ──────────────────────────────────────────────────────
  titres = signal<TitreFoncier[]>([]);
  loading = signal(false);
  error = signal('');
  total = signal(0);
  page = signal(1);
  pageSize = 10;
  searchQuery = signal('');

  // ── Computed ───────────────────────────────────────────────────
  totalPages = computed(() => Math.ceil(this.total() / this.pageSize));

  readonly STATUS_LABELS = STATUS_LABELS;
  readonly STATUS_BADGE  = STATUS_BADGE;

  ngOnInit(): void {
    this.load();

    // Debounce recherche
    this.search$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(q => {
      this.searchQuery.set(q);
      this.page.set(1);
      this.load();
    });
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
        next : res => {
          console.log('API response:', res); 
          this.titres.set(res);
          this.total.set(res.length);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger les titres fonciers.');
          this.loading.set(false);
        },
      });
  }

  onSearch(value: string): void {
    this.search$.next(value);
  }

  onPageChange(p: number): void {
    this.page.set(p);
    this.load();
  }

  // ── Ouvrir formulaire création ─────────────────────────────────
  openCreate(): void {
    const ref = this.modal.open(TitreFoncierForm, {
      size: 'lg', centered: true, backdrop: 'static',
    });
    ref.result.then(
      created => { 
        if (created) {
          this.load();
          this.confirmation.inform({
            context: 'create',
            title:   'Titre foncier créé',
            message: 'Le titre foncier a été créé avec succès.',
            type:    'bg-success',
            closeLabel: 'Ok',
          });
        } 
      },
      () => {},
    );
  }

  // ── Ouvrir formulaire édition ──────────────────────────────────
  openEdit(titre: TitreFoncier): void {
    const ref = this.modal.open(TitreFoncierForm, {
      size: 'lg', centered: true, backdrop: 'static',
    });
    ref.componentInstance.titre = titre;
    ref.result.then(
      updated => { 
        if (updated) {
          this.load();
          this.confirmation.inform({
            context: 'update',
            title:   'Titre foncier modifié',
            message: 'Le titre foncier a été modifié avec succès.',
            type:    'bg-info',
            closeLabel: 'Ok',
          });
        } 
      },
      () => {},
    );
  }

  // ── Ouvrir modal vérification (admin) ─────────────────────────
  openVerification(titre: TitreFoncier): void {
    const ref = this.modal.open(TitreFoncierVerification, {
      size: 'md', centered: true, backdrop: 'static',
    });
    ref.componentInstance.titre = titre;
    ref.result.then(
      done => { if (done) this.load(); },
      () => {},
    );
  }

  async onDelete(t: TitreFoncier) {
  
    const formattedDate = this.datePipe.transform(t.created_at, 'dd/MM/yyyy');
  
    const confirmed = await this.confirmation.confirm({
      title: 'Confirmation de suppression',
      type: 'bg-danger',
      message: `Êtes-vous sûr de vouloir supprimer ce titre foncier ?
                Cette action est irréversible.`,
      icon: 'bi-trash',
      iconMessageSmall: '⚠️',
      iconMessageBig: '❌',
      confirmLabel: 'Oui, supprimer',
      cancelLabel: 'Non',
      zonePhraseTwo: `Numéro du titre foncier: ${t.numero}`,
      zonePhraseThree: `Date de création: ${formattedDate}`,
      requireMotif:  true,
      motifMinLength: 10,
      size: 'lg',
    });
  
    if (!confirmed) return;

    const motif = typeof confirmed === 'string' ? confirmed : 'Suppression demandée';
  
    try {
      this.svc.delete(t.id, motif)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next : () => {
            this.load();
            this.confirmation.inform({
              context:    'delete',
              title:      'Titre foncier supprimé',
              message:    `"${t.numero}" a été supprimé définitivement.`,
              type:       'bg-danger',
              closeLabel: 'Ok',
            });
          },
          error: (err) => {
            const msg = err?.error?.detail 
            ?? 'Suppression impossible — ce système est peut-être utilisé.';
            this.error.set(msg);
          },
      });
    } finally {
      setTimeout(() => {
        this.modal.dismissAll();
      }, 3000);
    }
  
  }

  trackById(_: number, t: TitreFoncier): string { return t.id; }
}
