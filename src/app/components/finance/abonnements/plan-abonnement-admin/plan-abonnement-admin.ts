import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { NgbModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Alert } from '../../../alerts/alert/alert';
import { AbonnementService } from '../../services/abonnement';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';
import { ToastService } from '../../../../services/toast.service';
import { PlanAbonnement } from '../../models/abonnement.model';
import { PlanAbonnementAdminModal } from '../plan-abonnement-admin-modal/plan-abonnement-admin-modal';

@Component({
  selector: 'app-plan-abonnement-admin',
  standalone: true,
  imports: [CommonModule, NgbTooltipModule, Alert],
  templateUrl: './plan-abonnement-admin.html',
  styleUrl: './plan-abonnement-admin.scss'
})
export class PlanAbonnementAdmin implements OnInit{

  private aboSvc       = inject(AbonnementService);
  private modalService = inject(NgbModal);
  private confirmation = inject(ConfirmationService);
  private toast        = inject(ToastService);

  plans        = this.aboSvc.plans;
  isLoading    = signal(true);
  errorMessage = '';

  ngOnInit(): void {
    this.aboSvc.getPlans().subscribe({
      next:  () => this.isLoading.set(false),
      error: () => { 
        this.isLoading.set(false); 
        this.errorMessage = 'Erreur chargement.'; 
      }
    });
  }

  ouvrirCreation(): void {
    const ref = this.modalService.open(PlanAbonnementAdminModal, {
      size: 'md', centered: true, backdrop: 'static'
    });
    ref.result.then(
      (plan: PlanAbonnement) => this.toast.showSuccess(`Plan "${plan.nom}" créé !`),
      () => {}
    );
  }

  ouvrirEdition(plan: PlanAbonnement): void {
    const ref = this.modalService.open(PlanAbonnementAdminModal, {
      size: 'md', centered: true, backdrop: 'static'
    });
    ref.componentInstance.plan = plan;
    ref.result.then(
      (planMAJ: PlanAbonnement) => { 
        this.toast.showSuccess(`Plan "${planMAJ.nom}" mis à jour !`) 
      },
      () => {}
    );
  }

  async supprimerPlan(plan: PlanAbonnement): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title:        `Supprimer "${plan.nom}"`,
      type:         'bg-danger',
      message:      'Les abonnements actifs sur ce plan ne seront pas affectés.',
      icon:         'bi-trash',
      confirmLabel: 'Supprimer',
      cancelLabel:  'Annuler',
    });
    if (!confirmed) return;

    this.aboSvc.deletePlan(plan.id).subscribe({
      next:  () => this.toast.showSuccess(`Plan "${plan.nom}" supprimé.`),
      error: err => this.toast.showError(err.error?.detail ?? 'Erreur suppression.')
    });
  }

  toggleActif(plan: PlanAbonnement): void {
    this.aboSvc.updatePlan(plan.id, { est_actif: !plan.est_actif }).subscribe({
      next:  p => this.toast.showInfo(p.est_actif ? 'Plan activé.' : 'Plan désactivé.'),
      error: () => this.toast.showError('Erreur.')
    });
  }

  getNiveauColor = (n: string) => this.aboSvc.getNiveauColor(n);
  getNiveauBg    = (n: string) => this.aboSvc.getNiveauBg(n);

}
