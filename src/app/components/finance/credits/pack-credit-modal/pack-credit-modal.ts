import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { Alert } from '../../../alerts/alert/alert';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PackCredit } from '../../models/credit.model';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { CreditService } from '../../services/credit';

@Component({
  selector: 'app-pack-credit-modal',
  imports: [CommonModule, ReactiveFormsModule, Alert],
  templateUrl: './pack-credit-modal.html',
  styleUrl: './pack-credit-modal.scss'
})
export class PackCreditModal implements OnInit {

  @Input() pack: PackCredit | null = null;

  form!: FormGroup;
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal('');

  private fb          = inject(FormBuilder);
  private activeModal = inject(NgbActiveModal);
  private creditSvc   = inject(CreditService);

  get isEditMode(): boolean { return !!this.pack; }
  fieldErrors = signal<Record<string, string>>({});

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.form = this.fb.group({
      nom: [this.pack?.nom ?? '', [Validators.required, Validators.maxLength(60)]],
      description:   [this.pack?.description ?? '',  []],
      prix_fcfa: [
        this.pack?.prix_fcfa ?? null,  [Validators.required, Validators.min(100)]
      ],
      nb_credits: [
        this.pack?.nb_credits ?? null, [Validators.required, Validators.min(1)]
      ],
      bonus_credits: [this.pack?.bonus_credits ?? 0, [Validators.min(0)]],
      ordre: [this.pack?.ordre ?? 1, [Validators.required, Validators.min(1)]],
      est_actif: [this.pack?.est_actif ?? true,  []],
    });
  }

  // ── Helpers template ──────────────────────────────────────────────────────

  /** Aperçu du coût par crédit calculé en temps réel */
  get coutParCreditPreview(): string {
    const prix   = this.form.get('prix_fcfa')?.value ?? 0;
    const nb     = (this.form.get('nb_credits')?.value ?? 0)
                 + (this.form.get('bonus_credits')?.value ?? 0);
    if (!prix || !nb) return '—';
    return (prix / nb).toFixed(1);
  }

  get totalCreditsPreview(): number {
    return (this.form.get('nb_credits')?.value ?? 0)
         + (this.form.get('bonus_credits')?.value ?? 0);
  }

  clearError():   void { this.errorMessage.set(null); }
  clearSuccess(): void { this.successMessage.set(''); }

  getFieldError(field: string): string {
    const ctrl = this.form.get(field);
    if (ctrl?.touched && ctrl.hasError('required')) return 'Ce champ est obligatoire.';
    return this.fieldErrors()[field] ?? '';
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const payload = this.form.getRawValue();

    const action$ = this.isEditMode
      ? this.creditSvc.updatePack(this.pack!.id, payload)
      : this.creditSvc.createPack(payload);

    action$.subscribe({
      next: (pack) => {
        this.isSubmitting.set(false);
        this.successMessage.set(
          this.isEditMode ? 'Pack mis à jour !' : 'Pack créé avec succès !'
        );
        setTimeout(() => this.activeModal.close(pack), 1500);
      },
      error: err => {
        this.isSubmitting.set(false);
        const detail = err.error?.detail
          ?? err.error?.nom?.[0]
          ?? err.error?.prix_fcfa?.[0]
          ?? 'Une erreur est survenue.';
        this.errorMessage.set(detail);
      }
    });
  }

  onCancel(): void {
    this.activeModal.dismiss();
  }

}
