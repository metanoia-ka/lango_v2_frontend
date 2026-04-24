import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MethodePaiement, PackCredit } from '../../models/credit.model';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { CreditService } from '../../services/credit';

@Component({
  selector: 'app-credit-achat-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './credit-achat-modal.html',
  styleUrl: './credit-achat-modal.scss'
})
export class CreditAchatModal implements OnInit{

  @Input() pack!: PackCredit;

  private activeModal   = inject(NgbActiveModal);
  private creditService = inject(CreditService);

  methodeChoisie = signal<MethodePaiement | null>(null);
  isSubmitting   = signal(false);
  errorMessage   = signal('');
  successMessage = signal('');

  readonly methodes: { 
    value: MethodePaiement; label: string; icon: string; desc: string 
  }[] = [
    {
      value: 'MTN_MOMO',
      label: 'MTN Mobile Money',
      icon:  'bi-phone-fill',
      desc:  'Paiement via votre compte MTN MoMo',
    },
    {
      value: 'ORANGE',
      label: 'Orange Money',
      icon:  'bi-phone',
      desc:  'Paiement via votre compte Orange Money',
    },
    {
      value: 'STRIPE',
      label: 'Carte bancaire',
      icon:  'bi-credit-card-fill',
      desc:  'Visa, Mastercard — paiement sécurisé',
    },
  ];

  ngOnInit(): void {}

  choisirMethode(m: MethodePaiement): void {
    this.methodeChoisie.set(m);
    this.errorMessage.set('');
  }

  confirmer(): void {
    if (!this.methodeChoisie()) {
      this.errorMessage.set('Veuillez choisir une méthode de paiement.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.creditService.initierAchat({
      pack:             this.pack.id,
      methode_paiement: this.methodeChoisie()!,
    }).subscribe({
      next: achat => {
        this.isSubmitting.set(false);
        this.successMessage.set(`Achat initié ! Pack choisi : ${achat.pack_nom}… `);
        this.creditService.rafraichirSolde();
        setTimeout(() => this.activeModal.close('achat_initie'), 2500);
      },
      error: err => {
        this.isSubmitting.set(false);
        const detail = err.error?.detail ?? 'Erreur lors de l\'initiation de l\'achat.';
        this.errorMessage.set(detail);
      }
    });
  }

  annuler(): void {
    this.activeModal.dismiss('cancelled');
  }

}
