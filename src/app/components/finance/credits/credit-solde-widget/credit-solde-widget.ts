import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { CauseDebit } from '../../models/credit.model';
import { CreditService } from '../../services/credit';

@Component({
  selector: 'app-credit-solde-widget',
  imports: [CommonModule, RouterModule, NgbTooltipModule, DecimalPipe],
  templateUrl: './credit-solde-widget.html',
  styleUrl: './credit-solde-widget.scss'
})
export class CreditSoldeWidget implements OnInit {

  /** Si fourni, vérifie si le solde est suffisant pour cette action */
  @Input() checkAction?: CauseDebit;
  /** Mode compact pour le header */
  @Input() compact = false;

  private creditService = inject(CreditService);

  solde          = this.creditService.solde;
  coutAction     = signal<number | null>(null);
  soldeSuffisant = signal<boolean | null>(null);
  isLoading      = signal(false);

  ngOnInit(): void {
    this.isLoading.set(true);
    this.creditService.getSolde(this.checkAction).subscribe({
      next: data => {
        this.isLoading.set(false);
        if (data.cout_action !== undefined) {
          this.coutAction.set(data.cout_action);
          this.soldeSuffisant.set(data.solde_suffisant ?? null);
        }
      },
      error: () => this.isLoading.set(false),
    });
  }

  rafraichir(): void {
    this.creditService.getSolde(this.checkAction).subscribe({
      next: data => {
        if (data.cout_action !== undefined) {
          this.coutAction.set(data.cout_action);
          this.soldeSuffisant.set(data.solde_suffisant ?? null);
        }
      },
    });
  }

}
