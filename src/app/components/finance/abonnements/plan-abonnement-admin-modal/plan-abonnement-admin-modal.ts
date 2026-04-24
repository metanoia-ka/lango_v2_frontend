import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Alert } from '../../../alerts/alert/alert';
import { PlanAbonnement } from '../../models/abonnement.model';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AbonnementService } from '../../services/abonnement';

@Component({
  selector: 'app-plan-abonnement-admin-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Alert],
  templateUrl: './plan-abonnement-admin-modal.html',
  styleUrl: './plan-abonnement-admin-modal.css'
})
export class PlanAbonnementAdminModal implements OnInit {

  @Input() plan: PlanAbonnement | null = null;

  form!: FormGroup;
  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal('');

  private fb          = inject(FormBuilder);
  private activeModal = inject(NgbActiveModal);
  private aboSvc      = inject(AbonnementService);

  get isEditMode(): boolean { return !!this.plan; }
  fieldErrors = signal<Record<string, string>>({});

  readonly niveaux = [
    { value: 'ESSENTIEL',     label: 'Essentiel' },
    { value: 'PROFESSIONNEL', label: 'Professionnel' },
    { value: 'AGENCE',        label: 'Agence' },
  ];

  ngOnInit(): void {
    this.form = this.fb.group({
      nom: [
        this.plan?.nom ?? '', [Validators.required, Validators.maxLength(60)]
      ],
      niveau: [this.plan?.niveau ?? 'ESSENTIEL',   [Validators.required]],
      description:       [this.plan?.description ?? '',       []],
      prix_mensuel_fcfa: [
        this.plan?.prix_mensuel_fcfa ?? null, [Validators.required, Validators.min(0)]
      ],
      nb_annonces_max:   [
        this.plan?.nb_annonces_max ?? 5, [Validators.required]
      ],
      nb_boosts_inclus:  [
        this.plan?.nb_boosts_inclus ?? 0, [Validators.min(0)]
      ],
      stats_avancees: [this.plan?.stats_avancees ?? false,  []],
      export_stats: [this.plan?.export_stats ?? false, []],
      annonce_epinglee:  [this.plan?.annonce_epinglee ?? false, []],
      est_actif:         [this.plan?.est_actif ?? true, []],
      ordre: [this.plan?.ordre ?? 1,  [Validators.required, Validators.min(1)]],
    });
  }

  get illimite(): boolean {
    return this.form.get('nb_annonces_max')?.value === -1;
  }

  toggleIllimite(): void {
    const ctrl = this.form.get('nb_annonces_max')!;
    ctrl.setValue(ctrl.value === -1 ? 5 : -1);
  }

  clearError():   void { this.errorMessage.set(null); }
  clearSuccess(): void { this.successMessage.set(''); }
  onCancel():     void { this.activeModal.dismiss(); }

  getFieldError(field: string): string {
    const ctrl = this.form.get(field);
    if (ctrl?.touched && ctrl.hasError('required')) return 'Ce champ est obligatoire.';
    return this.fieldErrors()[field] ?? '';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const payload = this.form.getRawValue();

    const action$ = this.isEditMode
      ? this.aboSvc.updatePlan(this.plan!.id, payload)
      : this.aboSvc.createPlan(payload);

    action$.subscribe({
      next: plan => {
        this.isSubmitting.set(false);
        this.successMessage.set(this.isEditMode ? 'Plan mis à jour !' : 'Plan créé !');
        setTimeout(() => this.activeModal.close(plan), 1500);
      },
      error: err => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.detail ?? err.error?.nom?.[0] ?? 'Erreur.');
      }
    });
  }

}
