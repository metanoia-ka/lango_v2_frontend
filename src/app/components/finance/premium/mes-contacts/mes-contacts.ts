import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Authentication } from '../../../../auth/core/authentication';
import { ToastService } from '../../../../services/toast.service';
import { PremiumService } from '../../services/premium';

@Component({
  selector: 'app-mes-contacts',
  imports: [CommonModule, NgbTooltipModule],
  templateUrl: './mes-contacts.html',
  styleUrl: './mes-contacts.scss'
})
export class MesContacts implements OnInit {
 
  protected auth    = inject(Authentication);
  private premSvc   = inject(PremiumService);
  private toast     = inject(ToastService);

  contacts  = this.premSvc.contacts;
  isLoading = this.premSvc.isLoading;
  traitant  = signal<string | null>(null);
 
  isAdminOrManager = this.auth.hasAnyRole(['Admin', 'Manager']);
 
  ngOnInit(): void {
    this.premSvc.getContacts().subscribe();
  }
 
  traiter(id: string, decision: 'TRANSMISE' | 'REFUSEE', note = ''): void {
    this.traitant.set(id);
    this.premSvc.traiterContact(id, decision, note).subscribe({
      next: () => {
        this.toast.showSuccess(
          decision === 'TRANSMISE' ? 'Demande transmise.' : 'Demande refusée.'
        );
        this.traitant.set(null);
      },
      error: err => {
        this.toast.showError(err.error?.detail ?? 'Erreur.');
        this.traitant.set(null);
      }
    });
  }
 
  getStatutClass = (s: string) => this.premSvc.getStatutDemandeClass(s);

}
