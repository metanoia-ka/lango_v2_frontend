import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-quota-atteint-modal',
  imports: [CommonModule, RouterModule],
  templateUrl: './quota-atteint-modal.html',
  styleUrl: './quota-atteint-modal.scss'
})
export class QuotaAtteintModal {

  @Input() message:     string  = '';
  @Input() heures:      number  = 6;
  @Input() estVisiteur: boolean = false;
  @Input() solde?:      number;
 
  private activeModal = inject(NgbActiveModal);
 
  fermer(): void { this.activeModal.close(); }

}
