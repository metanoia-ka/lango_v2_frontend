import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { AbonnementService } from '../../services/abonnement';
import { ToastService } from '../../../../services/toast.service';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';
import { Authentication } from '../../../../auth/core/authentication';
import { PlanAbonnement } from '../../models/abonnement.model';

@Component({
  selector: 'app-plan-list',
  imports: [CommonModule, NgbTooltipModule],
  templateUrl: './plan-list.html',
  styleUrl: './plan-list.scss'
})
export class PlanList implements OnInit {

  private aboSvc       = inject(AbonnementService);
  private confirmation = inject(ConfirmationService);
  private toast        = inject(ToastService);
  protected auth       = inject(Authentication);

  plans       = this.aboSvc.plans;
  abonnement  = this.aboSvc.abonnement;
  isLoading   = signal(true);
  submitting  = signal<string | null>(null); // id du plan en cours de souscription

  ngOnInit(): void {
    this.aboSvc.getPlans().subscribe({
      next:  () => this.isLoading.set(false),
      error: () => this.isLoading.set(false),
    });
    
    this.aboSvc.getMonAbonnement().subscribe({
      error: () => {}   // 404 = normal si pas d'abonnement
    });
  }

  // ── Souscription ──────────────────────────────────────────────────────────

  async souscrire(plan: PlanAbonnement): Promise<void> {
    const planActuel = this.abonnement()?.plan_detail;
    const isUpgrade  = planActuel && plan.ordre > planActuel.ordre;
    const isDowngrade = planActuel && plan.ordre < planActuel.ordre;

    let titre   = `Souscrire au plan ${plan.nom}`;
    let message = `Votre abonnement commencera aujourd'hui pour 
                   ${plan.prix_mensuel_fcfa.toLocaleString()} FCFA/mois.`;

    if (isUpgrade) {
      titre   = `Passer au plan ${plan.nom}`;
      message = `Votre abonnement actuel sera remplacé. 
                 Le nouveau quota prend effet immédiatement.`;
    }
    if (isDowngrade) {
      titre   = `Rétrograder vers ${plan.nom}`;
      message = `Votre quota d'annonces sera réduit. 
                 Les annonces en cours ne sont pas affectées.`;
    }

    const confirmed = await this.confirmation.confirm({
      title:        titre,
      type:         'bg-success',
      message,
      icon:         'bi-patch-check',
      confirmLabel: 'Confirmer',
      cancelLabel:  'Annuler',
    });
    if (!confirmed) return;

    this.submitting.set(plan.id);

    const action$ = planActuel
      ? this.aboSvc.changerPlan(plan.id)
      : this.aboSvc.souscrire(plan.id);

    action$.subscribe({
      next: () => {
        this.submitting.set(null);
        this.toast.showSuccess(`Plan ${plan.nom} activé avec succès !`);
      },
      error: err => {
        this.submitting.set(null);
        this.toast.showError(err.error?.detail ?? 'Erreur lors de la souscription.');
        console.log(`Data sent: ${err.error?.detail}`);
      }
    });
  }

  // ── Résiliation ───────────────────────────────────────────────────────────

  async resilier(): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title:        'Résilier l\'abonnement',
      type:         'bg-danger',
      message:      `Votre abonnement sera résilié immédiatement. 
                     Vous ne pourrez plus publier d\'annonces.`,
      icon:         'bi-x-circle',
      confirmLabel: 'Oui, résilier',
      cancelLabel:  'Annuler',
    });
    if (!confirmed) return;

    this.aboSvc.resilier().subscribe({
      next: () => this.toast.showInfo('Abonnement résilié.'),
      error: err => this.toast.showError(err.error?.detail ?? 'Erreur.')
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  estPlanActuel(plan: PlanAbonnement): boolean {
    return this.abonnement()?.plan_detail?.id === plan.id
        && this.abonnement()?.est_actif === true;
  }

  getNiveauColor = (n: string) => this.aboSvc.getNiveauColor(n);
  getNiveauBg    = (n: string) => this.aboSvc.getNiveauBg(n);

  formatQuota(plan: PlanAbonnement): string {
    return plan.est_illimite ? 'Illimité' : `${plan.nb_annonces_max} annonces`;
  }

}
