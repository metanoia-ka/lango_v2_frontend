import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TarifAction, TarifActionService } from '../services/tarif-action';
import { ConfirmationService } from '../../confirmation-modal/service/confirmation';
import { ToastService } from '../../../services/toast.service';
import { Router } from '@angular/router';
import { Authentication } from '../../../auth/core/authentication';

@Component({
  selector: 'app-tarif-action-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbTooltipModule],
  templateUrl: './tarif-action-list.html',
  styleUrl: './tarif-action-list.scss'
})
export class TarifActionList implements OnInit {

  private router       = inject(Router);

  private tarifSvc     = inject(TarifActionService);
  private confirmation = inject(ConfirmationService);
  private toast        = inject(ToastService);
  protected readonly auth = inject(Authentication);
 
  tarifs       = this.tarifSvc.tarifs;
  isLoading    = this.tarifSvc.isLoading;
  causesDispos = this.tarifSvc.CAUSES_DISPONIBLES;
 
  // État formulaire inline
  afficherForm  = signal(false);
  enEdition     = signal<TarifAction | null>(null);
  enregistrant  = signal(false);
 
  // Champs formulaire
  form = {
    cause:       '',
    cout:        1,
    est_actif:   true,
    description: '',
  };

  isAdmin = this.auth.hasRole('Admin');
  isAdminOrManager = this.auth.hasAnyRole(['Admin', 'Manager']);
 
  ngOnInit(): void {
    this.tarifSvc.getTarifs().subscribe({
      next: (data) => console.log('Tarifs API =', data)
    });
  }
 
  ouvrirAjout(): void {
    this.enEdition.set(null);
    this.form = { cause: '', cout: 1, est_actif: true, description: '' };
    this.afficherForm.set(true);
  }
 
  ouvrirEdition(tarif: TarifAction): void {
    this.enEdition.set(tarif);
    this.form = {
      cause:       tarif.cause,
      cout:        tarif.cout,
      est_actif:   tarif.est_actif,
      description: tarif.description,
    };
    this.afficherForm.set(true);
  }
 
  annulerForm(): void {
    this.afficherForm.set(false);
    this.enEdition.set(null);
  }
 
  enregistrer(): void {
    if (!this.form.cause || this.form.cout < 0) {
      this.toast.showError('Cause et coût sont obligatoires.');
      return;
    }
 
    this.enregistrant.set(true);
    const edition = this.enEdition();
 
    const obs = edition
      ? this.tarifSvc.modifier(edition.id, this.form)
      : this.tarifSvc.creer(this.form);
 
    obs.subscribe({
      next: () => {
        this.toast.showSuccess(edition ? 'Tarif modifié.' : 'Tarif créé.');
        this.enregistrant.set(false);
        this.afficherForm.set(false);
        this.enEdition.set(null);
      },
      error: (err) => {
        this.toast.showError(err.error?.detail ?? 'Erreur enregistrement.');
        this.enregistrant.set(false);
      }
    });
  }

  backToCredits(): void {
    this.router.navigate(['/lango/credits']);
  }
 
  toggle(tarif: TarifAction): void {
    this.tarifSvc.toggleActif(tarif).subscribe({
      next: () => this.toast.showSuccess(
        tarif.est_actif ? 'Tarif désactivé.' : 'Tarif activé.'
      ),
      error: () => this.toast.showError('Erreur activation.')
    });
  }
 
  async supprimer(tarif: TarifAction): Promise<void> {
    const ok = await this.confirmation.confirm({
      title:        'Supprimer le tarif',
      type:         'bg-danger',
      message:      `Supprimer le tarif "${tarif.cause}" (${tarif.cout} cr.) ?`,
      icon:         'bi-trash',
      confirmLabel: 'Supprimer',
      cancelLabel:  'Annuler',
    });
    if (!ok) return;
 
    this.tarifSvc.supprimer(tarif.id).subscribe({
      next:  () => this.toast.showSuccess('Tarif supprimé.'),
      error: () => this.toast.showError('Erreur suppression.')
    });
  }
 
  getLabelCause(cause: string): string {
    return this.causesDispos.find(c => c.value === cause)?.label ?? cause;
  }

}
