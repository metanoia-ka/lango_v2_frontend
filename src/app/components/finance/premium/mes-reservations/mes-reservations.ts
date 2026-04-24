import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { RelativeTimePipe } from '../../../../pipe/relative-time.pipe';
import { ToastService } from '../../../../services/toast.service';
import { PremiumService } from '../../services/premium';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';
import { ReservationParcelle } from '../../models/premium.model';

@Component({
  selector: 'app-mes-reservations',
  imports: [CommonModule, NgbTooltipModule, RelativeTimePipe],
  templateUrl: './mes-reservations.html',
  styleUrl: './mes-reservations.scss'
})
export class MesReservations implements OnInit {
 
  private premSvc      = inject(PremiumService);
  private confirmation = inject(ConfirmationService);
  private toast        = inject(ToastService);

  reservations  = this.premSvc.reservations;
  isLoading     = this.premSvc.isLoading;
  annulant      = signal<string | null>(null);
 
  ngOnInit(): void {
    this.premSvc.getReservations().subscribe();
  }
 
  async annuler(r: ReservationParcelle): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title:        'Annuler la réservation',
      type:         'bg-danger',
      message:      `Annuler la réservation de la parcelle ${r.parcelle_numero} ?`,
      icon:         'bi-x-circle',
      confirmLabel: 'Oui, annuler',
      cancelLabel:  'Garder',
    });
    if (!confirmed) return;
 
    this.annulant.set(r.id);
    this.premSvc.annulerReservation(r.id).subscribe({
      next: () => {
        this.toast.showInfo('Réservation annulée.');
        this.annulant.set(null);
      },
      error: err => {
        this.toast.showError(err.error?.detail ?? 'Erreur annulation.');
        this.annulant.set(null);
      }
    });
  }
 
  getStatutClass    = (s: string) => this.premSvc.getStatutReservationClass(s);

}
