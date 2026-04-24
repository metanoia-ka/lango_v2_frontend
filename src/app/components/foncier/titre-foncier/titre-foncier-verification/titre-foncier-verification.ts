import { CommonModule } from '@angular/common';
import { Component, inject, Input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TitreFoncier } from '../../models/titre-foncier.model';
import { TitreFoncierService } from '../../services/titre-foncier';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

export type DecisionType = 'valider' | 'rejeter' | 'a_corriger';

@Component({
  selector: 'app-titre-foncier-verification',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './titre-foncier-verification.html',
  styleUrl: './titre-foncier-verification.scss'
})
export class TitreFoncierVerification {

  @Input({ required: true }) titre!: TitreFoncier;

  private readonly fb  = inject(FormBuilder);
  private readonly svc = inject(TitreFoncierService);
  readonly activeModal = inject(NgbActiveModal);

  loading   = signal(false);
  error     = signal('');
  decision  = signal<DecisionType | null>(null);

  form = this.fb.group({
    commentaire: ['', Validators.maxLength(1000)],
  });

  setDecision(d: DecisionType): void {
    this.decision.set(d);
    this.error.set('');

    // Commentaire obligatoire pour rejet/correction
    const ctrl = this.form.controls['commentaire'];
    if (d !== 'valider') {
      ctrl.setValidators([Validators.required, Validators.maxLength(1000)]);
    } else {
      ctrl.setValidators([Validators.maxLength(1000)]);
    }
    ctrl.updateValueAndValidity();
  }

  onSubmit(): void {
    if (!this.decision()) {
      this.error.set('Veuillez choisir une décision.');
      return;
    }

    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const d           = this.decision()!;
    const commentaire = this.form.value.commentaire ?? '';

    const payload = d === 'valider'
      ? { valide: true,  commentaire }
      : { valide: false, commentaire, action_type: d as 'rejeter' | 'a_corriger' };

    this.loading.set(true);
    this.error.set('');

    this.svc.verifier(this.titre.id, payload).subscribe({
      next : res => {
        this.loading.set(false);
        this.activeModal.close(res);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(
          err?.error?.detail
          ?? err?.error?.non_field_errors?.[0]
          ?? 'Une erreur est survenue.'
        );
      },
    });
  }
}
