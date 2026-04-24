import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CoordinateSystem } from '../../models/coordinate-system.model';
import { CoordinateSystemService } from '../../services/coordinate-system';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';

const SRID_SUGGESTIONS = [
  { srid: 32632, label: 'WGS 84 / UTM zone 32N' },
  { srid: 32633, label: 'WGS 84 / UTM zone 33N' },
  { srid: 32631, label: 'WGS 84 / UTM zone 31N' },
  { srid: 4326,  label: 'WGS 84 (géographique)' },
  { srid: 3857,  label: 'Web Mercator (Pseudo-Mercator)' },
  { srid: 4215,  label: 'Minna (Nigéria/Cameroun)' },
];

@Component({
  selector: 'app-coordinate-system-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './coordinate-system-form.html',
  styleUrl: './coordinate-system-form.scss'
})
export class CoordinateSystemForm implements OnInit, OnDestroy {

  @Input() system?: CoordinateSystem;

  private readonly fb       = inject(FormBuilder);
  private readonly svc      = inject(CoordinateSystemService);
  readonly activeModal      = inject(NgbActiveModal);
  private readonly destroy$ = new Subject<void>();

  saving = signal(false);
  error = signal('');
  fieldErrors = signal<Record<string, string>>({});

  readonly suggestions = SRID_SUGGESTIONS;

  form = this.fb.group({
    nom:         ['', [Validators.required, Validators.maxLength(100)]],
    srid:        [null as number | null, [Validators.required, Validators.min(1)]],
    description: [''],
  });

  get isEdit(): boolean { return !!this.system; }

  ngOnInit(): void {
    if (this.system) {
      this.form.patchValue({
        nom:         this.system.nom,
        srid:        this.system.srid,
        description: this.system.description,
      });
      // SRID non modifiable en édition — évite les incohérences en base
      this.form.get('srid')!.disable();
    }
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  applySuggestion(srid: number, label: string): void {
    this.form.patchValue({ srid, nom: label });
    this.fieldErrors.update(e => ({ ...e, srid: '', nom: '' }));
  }

  getFieldError(field: string): string {
    const ctrl = this.form.get(field);
    if (ctrl?.touched && ctrl.hasError('required'))  return 'Ce champ est obligatoire.';
    if (ctrl?.touched && ctrl.hasError('maxlength')) return 'Valeur trop longue (max 100).';
    if (ctrl?.touched && ctrl.hasError('min'))       return 'Le SRID doit être > 0.';
    return this.fieldErrors()[field] ?? '';
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.error.set('');
    this.fieldErrors.set({});

    const raw = this.form.getRawValue(); // getRawValue inclut les champs disabled
    const payload = {
      nom:         raw.nom!,
      srid:        raw.srid!,
      description: raw.description ?? '',
    };

    const obs$ = this.isEdit
      ? this.svc.update(this.system!.id, 
        { nom: payload.nom, description: payload.description }
      )
      : this.svc.create(payload);

    obs$.pipe(takeUntil(this.destroy$)).subscribe({
      next:  () => this.activeModal.close('saved'),
      error: err => {
        this.saving.set(false);
        if (err.error && typeof err.error === 'object') {
          const errs: Record<string, string> = {};
          Object.keys(err.error).forEach(k => {
            errs[k] = Array.isArray(err.error[k]) ? err.error[k][0] : String(err.error[k]);
          });
          this.fieldErrors.set(errs);
        } else {
          this.error.set('Une erreur est survenue.');
        }
      },
    });
  }

}
