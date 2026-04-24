import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CreditService } from '../../services/credit';
import { NgbModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { 
  AchatCredit, 
  CauseDebit, 
  PackCredit, 
  TypeTransaction 
} from '../../models/credit.model';
import { CreditAchatModal } from '../credit-achat-modal/credit-achat-modal';
import { RelativeTimePipe } from '../../../../pipe/relative-time.pipe';
import { FormsModule } from '@angular/forms';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ToastService } from '../../../../services/toast.service';
import { Authentication } from '../../../../auth/core/authentication';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';
import { Router } from '@angular/router';

@Component({
  selector: 'app-credit-dashboard',
  imports: [CommonModule, FormsModule, NgbTooltipModule, RelativeTimePipe, DecimalPipe],
  templateUrl: './credit-dashboard.html',
  styleUrl: './credit-dashboard.scss'
})
export class CreditDashboard implements OnInit, OnDestroy {

  private creditService = inject(CreditService);
  private toast        = inject(ToastService);
  protected readonly auth = inject(Authentication);
  private confirmation = inject(ConfirmationService);

  private modalService  = inject(NgbModal);
  private sub           = new Subscription();
  private router        = inject(Router);

  solde        = this.creditService.solde;
  packs        = this.creditService.packs;
  transactions = this.creditService.transactions;
  achats       = this.creditService.achats;

  isLoading    = signal(false);

  onglet      = signal<'packs' | 'historique' | 'achats'>('packs');
  filtreType  = signal<TypeTransaction | ''>('');
  filtreCause = signal<CauseDebit | ''>('');
  
  isAdmin = this.auth.hasRole('Admin');
  isAdminOrManager = this.auth.hasAnyRole(['Admin', 'Manager']);

  readonly typesTransaction = [
    { value: '' as const,             label: 'Tous types'       },
    { value: 'CREDIT' as const,       label: 'Crédits reçus'    },
    { value: 'DEBIT' as const,        label: 'Débits'           },
    { value: 'REMBOURSEMENT' as const, label: 'Remboursements'  },
  ];

  readonly causes = [
    { value: '' as const,                label: 'Toutes causes'        },
    { value: 'ACHAT_PACK' as const,      label: 'Achat pack'           },
    { value: 'VOIR_PARCELLE' as const,   label: 'Consultation parcelle'},
    { value: 'VOIR_ANNONCE',             label: 'Consultation annonce' },
    { value: 'VOIR_CHAINE' as const,     label: 'Chaîne foncière'      },
    { value: 'CONTACTER_VENDOR' as const, label: 'Contact vendeur'     },
    { value: 'EXPORT_PDF' as const,      label: 'Export PDF'           },
    { value: 'BOOST_ANNONCE' as const,   label: 'Boost annonce'        },
    { value: 'RAPPORT_MARCHE' as const,  label: 'Rapport de marché'    },
    { value: 'REMBOURSEMENT' as const,   label: 'Remboursement'        },
    { value: 'RESERVATION_PARCELLE' as const,   label: 'Réservation(s) parcelle(s)' },
  ];

  ngOnInit(): void {
    this._loadPacksAndSoldes();
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  changerOnglet(o: 'packs' | 'historique' | 'achats'): void {
    this.onglet.set(o);
    if (o === 'historique') {
      this._loadTransactions();
      return;
    }
    if (o === 'achats') {
      this.isLoading.set(true);
      this.sub.add(
        this.creditService.getMesAchats().subscribe({
          next:  () => this.isLoading.set(false),
          error: () => this.isLoading.set(false),
        })
      );
      return;
    }
    // packs — déjà chargé au init
    this.isLoading.set(false);
  }

  appliquerFiltres(): void { this._loadTransactions(); }

  resetFiltres(): void {
    this.filtreType.set('');
    this.filtreCause.set('');
    this._loadTransactions();
  }

  private _loadTransactions(): void {
    this.isLoading.set(true);
    const filters: any = {};
    if (this.filtreType())  filters.type  = this.filtreType();
    if (this.filtreCause()) filters.cause = this.filtreCause();
    this.sub.add(this.creditService.getTransactions(filters).subscribe({
      next:  () => this.isLoading.set(false),
      error: () => this.isLoading.set(false),
    }));
  }

  onTarifActions(): void {
    this.router.navigate(['/lango/credits/tarifs']);
  }

  private _loadPacksAndSoldes() {
    this.isLoading.set(true);
    this.sub.add(this.creditService.getPacks().subscribe({
      next: () => this.isLoading.set(false)
    }));
    this.sub.add(this.creditService.getSolde().subscribe({
      next:  () => this.isLoading.set(false),
      error: () => this.isLoading.set(false),
    }));
  }

  async onConfirm(achat: AchatCredit) {
    const result = await this.confirmation.confirm({
      title: 'Confirmation du paiement',
      type: 'bg-primary',
      message: `Confirmer le paiement de ${achat.montant_fcfa} FCFA ?`,
      icon: 'bi-check-circle',
      confirmLabel: 'Oui, confirmer',
      cancelLabel: 'Annuler',
    });

    if (!result) return;
    this.confirmerManuellement(achat);
  }

  confirmerManuellement(achat: AchatCredit) {
    this.creditService.confirmerAchat(achat.id).subscribe({
      next: () => {
        this.toast.showSuccess('Achat confirmé et compte crédité !');
        this.creditService.getMesAchats().subscribe();
        this.creditService.rafraichirSolde();   // Mettre à jour le header
        this.confirmation.inform({
          context:    'submit',
          title:      'Confirmation du paiement',
          message:    `Le pack "${achat.pack_nom}" a été confirmé.`,
          type:       'bg-success',
          closeLabel: 'Ok',
        });
      },
      error: (err) => {
        this.toast.showError(`Erreur: ${err.error?.detail || 'Action impossible'}`);
      }
    });
  }

  ouvrirAchatModal(pack: PackCredit): void {
    const ref = this.modalService.open(CreditAchatModal, {
      size: 'md', centered: true, backdrop: 'static'
    });
    ref.componentInstance.pack = pack;
    ref.result.then(
      result => {
        if (result === 'achat_initie') {
          this.creditService.rafraichirSolde();
          this.sub.add(this.creditService.getMesAchats().subscribe());
        }
      },
      () => {}
    );
  }

  getStatutClass  = (s: string) => this.creditService.getStatutClass(s);
  getTypeClass    = (t: string) => this.creditService.getTypeClass(t);
  getTypeSign     = (t: string) => this.creditService.getTypeSign(t);
  getCauseLabel   = (c: string) => this.creditService.getCauseLabel(c);
  getMethodeLabel = (m: string) => this.creditService.getMethodeLabel(m);

}
