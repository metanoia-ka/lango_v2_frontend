import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { 
  Parcelle, 
  STATUT_PARCELLE_LABELS, 
  StatutParcelle 
} from '../../models/parcelle.model';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ParcelleService } from '../../services/parcelle';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-parcelle-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './parcelle-form.html',
  styleUrl: './parcelle-form.scss'
})
export class ParcelleForm implements OnInit, OnDestroy {

  @Input() parcelle?: Parcelle;
  @Input() lotissementId?: string;

  private readonly fb       = inject(FormBuilder);
  private readonly svc      = inject(ParcelleService);
  readonly activeModal      = inject(NgbActiveModal);
  private readonly destroy$ = new Subject<void>();

  saving      = signal(false);
  error       = signal('');
  fieldErrors = signal<Record<string, string>>({});

  readonly STATUT_LABELS = STATUT_PARCELLE_LABELS;
  readonly statutKeys    = Object.keys(STATUT_PARCELLE_LABELS) as StatutParcelle[];

  form = this.fb.group({
    lotissement_id: ['', Validators.required],
    statut:         ['DISPONIBLE' as StatutParcelle],
    bornes: this.fb.array([]),
  });

  get isEdit(): boolean { return !!this.parcelle; }
  get bornes(): FormArray { return this.form.get('bornes') as FormArray; }

  ngOnInit(): void {
    if (this.lotissementId) {
      this.form.patchValue({ lotissement_id: this.lotissementId });
    }
    if (this.parcelle) {
      this.form.patchValue({
        lotissement_id: this.parcelle.lotissement,
        statut:         this.parcelle.statut,
      });
      // Pré-remplir les bornes existantes
      this.parcelle.bornes?.forEach(
        b => this.addBorne(b.point_native?.x, b.point_native?.y)
      );
    } else {
      // Minimum 4 bornes à remplir
      for (let i = 0; i < 4; i++) this.addBorne();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  addBorne(x?: number, y?: number): void {
    this.bornes.push(this.fb.group({
      x: [x ?? '', [Validators.required, Validators.pattern(/^-?\d+(\.\d+)?$/)]],
      y: [y ?? '', [Validators.required, Validators.pattern(/^-?\d+(\.\d+)?$/)]],
    }));
  }

  removeBorne(i: number): void {
    if (this.bornes.length <= 4) return; // minimum 4
    this.bornes.removeAt(i);
  }

  getFieldError(field: string): string {
    const ctrl = this.form.get(field);
    if (ctrl?.touched && ctrl.hasError('required')) return 'Ce champ est obligatoire.';
    return this.fieldErrors()[field] ?? '';
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.saving.set(true);
    this.error.set('');
    this.fieldErrors.set({});

    const raw = this.form.value;
    const bornesData = (raw.bornes ?? []).map((b: any) => ({
      point: [parseFloat(b.x), parseFloat(b.y)] as [number, number],
    }));

    if (this.isEdit) {
      // Mise à jour statut uniquement (les bornes sont gérées séparément)
      this.svc.updateStatut(this.parcelle!.id, raw.statut as StatutParcelle)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next:  () => this.activeModal.close('saved'),
          error: () => { 
            this.saving.set(false); 
            this.error.set('Erreur lors de la mise à jour.'); 
          },
        });
    } else {
      this.svc.create({
        lotissement_id: raw.lotissement_id!,
        statut:         raw.statut as StatutParcelle,
        bornes_data:    bornesData,
      }).pipe(takeUntil(this.destroy$)).subscribe({
        next:  () => this.activeModal.close('saved'),
        error: err => {
          this.saving.set(false);
          if (err.error && typeof err.error === 'object') {
            const errs: Record<string, string> = {};
            Object.keys(err.error).forEach(k => {
              errs[k] = Array.isArray(
                err.error[k]) ? err.error[k][0] : String(err.error[k]
                  
                );
            });
            this.fieldErrors.set(errs);
            this.error.set(err.error?.error ?? err.error?.detail ?? '');
          } else {
            this.error.set('Une erreur est survenue.');
          }
        },
      });
    }
  }

}
