import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { PremiumService } from '../../services/premium';
import { ToastService } from '../../../../services/toast.service';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';

@Component({
  selector: 'app-mes-alertes',
  imports: [CommonModule, FormsModule, NgbTooltipModule],
  templateUrl: './mes-alertes.html',
  styleUrl: './mes-alertes.scss'
})
export class MesAlertes implements OnInit {
  
  private premSvc      = inject(PremiumService);
  private toast        = inject(ToastService);
  private confirmation = inject(ConfirmationService);

  alertes   = this.premSvc.alertes;
  isLoading = signal(false);
  afficherForm = signal(false);
 
  // Formulaire nouvelle alerte
  form = {
    type_cible:  'ZONE' as 'PARCELLE' | 'ZONE' | 'LOTISSEMENT',
    zone_texte:  '',
    parcelle_id: '',
    lotissement_id: '',
  };
 
  ngOnInit(): void {
    this.isLoading.set(true);
    this.premSvc.getAlertes().subscribe({
      next:  () => this.isLoading.set(false),
      error: () => this.isLoading.set(false),
    });
  }
 
  activerAlerte(): void {
    if (this.form.type_cible === 'ZONE' && !this.form.zone_texte.trim()) {
      this.toast.showError('Précisez la zone géographique.');
      return;
    }
 
    this.premSvc.activerAlerte({
      type_cible:      this.form.type_cible,
      zone_texte:      this.form.zone_texte || undefined,
      parcelle_id:     this.form.parcelle_id || undefined,
      lotissement_id:  this.form.lotissement_id || undefined,
    }).subscribe({
      next: () => {
        this.toast.showSuccess('Alerte activée — 3 crédits débités.');
        this.afficherForm.set(false);
        this.form = { 
          type_cible: 'ZONE', zone_texte: '', parcelle_id: '', lotissement_id: '' 
        };
      },
      error: err => {
        const msg = err.status === 402
          ? 'Crédits insuffisants pour activer cette alerte.'
          : (err.error?.detail ?? 'Erreur activation.');
        this.toast.showError(msg);
      }
    });
  }
 
  async supprimer(id: string): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title:        'Supprimer l\'alerte',
      type:         'bg-danger',
      message:      'Cette alerte sera définitivement supprimée.',
      icon:         'bi-trash',
      confirmLabel: 'Supprimer',
      cancelLabel:  'Annuler',
    });
    if (!confirmed) return;
 
    this.premSvc.supprimerAlerte(id).subscribe({
      next:  () => this.toast.showInfo('Alerte supprimée.'),
      error: err => this.toast.showError(err.error?.detail ?? 'Erreur.')
    });
  }
 
  basculer(id: string, statut: string): void {
    if (statut === 'ACTIVE') {
      this.premSvc.desactiverAlerte(id).subscribe({
        next:  () => this.toast.showInfo('Alerte mise en pause.'),
        error: err => this.toast.showError(err.error?.detail ?? 'Erreur.')
      });
    } else {
      // Réactiver → appel activer avec les mêmes params
      this.toast.showInfo('Pour réactiver, créez une nouvelle alerte.');
    }
  }
 
  getStatutClass  = (s: string) => this.premSvc.getStatutAlerteClass(s);
  getTypeCibleIcon = (t: string) => this.premSvc.getTypeCibleIcon(t);

}
