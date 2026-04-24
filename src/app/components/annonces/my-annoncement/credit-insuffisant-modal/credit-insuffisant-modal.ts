import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-credit-insuffisant-modal',
  imports: [CommonModule, RouterModule],
  templateUrl: './credit-insuffisant-modal.html',
  styleUrl: './credit-insuffisant-modal.scss'
})
export class CreditInsuffisantModal {

  @Input() solde:     number = 0;
  @Input() annonceId: string = '';

  private activeModal = inject(NgbActiveModal);
  private router      = inject(Router);

  fermer(): void {
    this.activeModal.dismiss('ferme');
  }

  goToAnnonce(): void {
    this.activeModal.dismiss('ferme');
    this.router.navigate(['/lango/annonces']);
  }

  allerAcheter(): void {
    this.activeModal.close('credits_achetes');
    this.router.navigate(['/lango/credits'], {
      queryParams: { redirect: `/lango/annonces/${this.annonceId}/detail` }
    });
  }

}
