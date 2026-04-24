import { Component, inject, OnInit, signal } from '@angular/core';
import { Alert } from '../../../alerts/alert/alert';
import { NgbModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { PackCredit } from '../../models/credit.model';
import { CreditService } from '../../services/credit';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';
import { ToastService } from '../../../../services/toast.service';
import { PackCreditModal } from '../pack-credit-modal/pack-credit-modal';

@Component({
  selector: 'app-pack-credit-list',
  imports: [CommonModule, NgbTooltipModule, Alert],
  templateUrl: './pack-credit-list.html',
  styleUrl: './pack-credit-list.scss'
})
export class PackCreditList implements OnInit{

  packs      = signal<PackCredit[]>([]);
  isLoading  = signal(true);
  errorMessage = '';

  private creditSvc    = inject(CreditService);
  private modalService = inject(NgbModal);
  private confirmation = inject(ConfirmationService);
  private toast        = inject(ToastService);

  ngOnInit(): void {
    this._loadPacks();
  }

  private _loadPacks(): void {
    this.isLoading.set(true);
    this.creditSvc.getPacks().subscribe({
      next: data => {
        this.packs.set(data);
        this.isLoading.set(false);
      },
      error: err => {
        this.errorMessage = `Erreur chargement (${err.status})`;
        this.isLoading.set(false);
      }
    });
  }

  // ── Ouvrir modale création ────────────────────────────────────────────────

  ouvrirCreation(): void {
    const ref = this.modalService.open(PackCreditModal, {
      size: 'md', centered: true, backdrop: 'static'
    });
    ref.result.then(
      (pack: PackCredit) => {
        this.packs.update(list => [...list, pack]
          .sort((a, b) => a.ordre - b.ordre));
        this.toast.showSuccess(`Pack "${pack.nom}" créé !`);
      },
      () => {}
    );
  }

  // ── Ouvrir modale édition ─────────────────────────────────────────────────

  ouvrirEdition(pack: PackCredit): void {
    const ref = this.modalService.open(PackCreditModal, {
      size: 'md', centered: true, backdrop: 'static'
    });
    ref.componentInstance.pack = pack;
    ref.result.then(
      (packMAJ: PackCredit) => {
        this.packs.update(list =>
          list.map(p => p.id === packMAJ.id ? packMAJ : p)
        );
        this._loadPacks();
        this.toast.showSuccess(`Pack "${packMAJ.nom}" mis à jour !`);
      },
      () => {}
    );
  }

  // ── Supprimer ─────────────────────────────────────────────────────────────

  async supprimerPack(pack: PackCredit): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title:        'Supprimer le pack',
      type:         'bg-danger',
      message:      `Supprimer définitivement le pack "${pack.nom}" ?`,
      icon:         'bi-trash',
      confirmLabel: 'Oui, supprimer',
      cancelLabel:  'Annuler',
    });
    if (!confirmed) return;

    this.creditSvc.deletePack(pack.id).subscribe({
      next: () => {
        this.packs.update(list => list.filter(p => p.id !== pack.id));
        this.toast.showSuccess(`Pack "${pack.nom}" supprimé.`);
      },
      error: err => {
        this.toast.showError(`Erreur suppression (${err.status})`);
      }
    });
  }

  // ── Basculer actif/inactif ────────────────────────────────────────────────

  toggleActif(pack: PackCredit): void {
    this.creditSvc.updatePack(pack.id, { est_actif: !pack.est_actif }).subscribe({
      next: packMAJ => {
        this.packs.update(list =>
          list.map(p => p.id === packMAJ.id ? packMAJ : p)
        );
        const msg = packMAJ.est_actif ? 'Pack activé.' : 'Pack désactivé.';
        this.toast.showInfo(msg);
      },
      error: () => this.toast.showError('Erreur mise à jour.')
    });
  }

}
