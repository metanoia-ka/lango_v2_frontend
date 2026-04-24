import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { CoordinateSystemService } from '../../services/coordinate-system';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { 
  CoordinateSystem, 
  CRS_OPERATION_ICON, 
  CRS_OPERATION_LABELS 
} from '../../models/coordinate-system.model';
import { CoordinateSystemForm } from '../coordinate-system-form/coordinate-system-form';
import { 
  CoordinateSystemDetail 
} from '../coordinate-system-detail/coordinate-system-detail';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';

@Component({
  selector: 'app-coordinate-system-list',
  imports: [CommonModule, FormsModule, NgbTooltipModule],
  templateUrl: './coordinate-system-list.html',
  styleUrl: './coordinate-system-list.scss',
  providers: [DatePipe]
})
export class CoordinateSystemList implements OnInit, OnDestroy {

  private readonly svc = inject(CoordinateSystemService);
  private confirmation = inject(ConfirmationService);
  
  private readonly modal = inject(NgbModal);
  private readonly destroy$ = new Subject<void>();
  private readonly search$  = new Subject<string>();
  private datePipe = inject(DatePipe);

  systems = signal<CoordinateSystem[]>([]);
  loading = signal(false);
  error = signal('');
  searchQuery = signal('');

  readonly OP_LABELS = CRS_OPERATION_LABELS;
  readonly OP_ICON   = CRS_OPERATION_ICON;

  ngOnInit(): void {
    this.search$.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(() => this.load());

    this.load();
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.svc.getAll(this.searchQuery()).pipe(takeUntil(this.destroy$)).subscribe({
      next:  res => { this.systems.set(res); this.loading.set(false); },
      error: ()  => { 
        this.error.set('Impossible de charger les systèmes.'); 
        this.loading.set(false); 
      },
    });
  }

  onSearch(q: string): void { this.searchQuery.set(q); this.search$.next(q); }

  openCreate(): void {
    const ref = this.modal.open(CoordinateSystemForm, { size: 'md', centered: true });
    ref.result.then(r => { 
      if (r === 'saved') { 
        this.load();
        this.confirmation.inform({
          context: 'create',
          title:   'Système de coordonnées créé',
          type:    'bg-success',
          closeLabel: 'Ok',
          message: 'Le système de coordonnées a été créé avec succès.',
        });
      }
    }, () => {});
  }

  openEdit(cs: CoordinateSystem): void {
    const ref = this.modal.open(CoordinateSystemForm, { size: 'md', centered: true });
    ref.componentInstance.system = cs;
    ref.result.then(r => { 
      if (r === 'saved') { 
        this.load();
        this.confirmation.inform({
          context: 'update',
          title:   'Système de coordonnées modifié',
          message: 'Le système de coordonnées a été modifié avec succès.',
          type:    'bg-info',
          closeLabel: 'Ok',
        });
      } 
    }, () => {});
  }

  openDetail(cs: CoordinateSystem): void {
    const ref = this.modal.open(CoordinateSystemDetail, { size: 'lg', centered: true });
    ref.componentInstance.systemId = cs.id;
  }

  async onDelete(cs: CoordinateSystem) {
    
    const formattedDate = this.datePipe.transform(cs.created_at, 'dd/MM/yyyy');
    
    const result = await this.confirmation.confirm({
      title: 'Confirmation de suppression',
      type: 'bg-danger',
      message: `Êtes-vous sûr de vouloir supprimer ce systeme de coordonnees ?
      Cette action est irréversible.`,
      icon: 'bi-trash',
      iconMessageSmall: '⚠️',
      iconMessageBig: '❌',
      confirmLabel: 'Oui, supprimer',
      cancelLabel: 'Annuler',
      zonePhraseTwo: `Numéro du systeme: ${cs.nom}`,
      zonePhraseThree: `Date de création: ${formattedDate}`,
      requireMotif:  true,
      motifMinLength: 10,
      size: 'lg',
    });
    
    if (!result) return;

    const motif = typeof result === 'string' ? result : 'Suppression demandée';
    
    try {
      this.svc.delete(cs.id, motif).pipe(takeUntil(this.destroy$)).subscribe({
        next:  () => {
          this.load();
          this.confirmation.inform({
            context:    'delete',
            title:      'Système de coordonnées supprimé',
            message:    `"${cs.nom}" a été supprimé définitivement.`,
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

  trackById(_: number, item: CoordinateSystem): string { return item.id; }

}
