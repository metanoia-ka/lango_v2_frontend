import { Component, OnDestroy, OnInit } from '@angular/core';
import { AchatCredit } from '../../models/credit.model';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { 
  NgbModal,
  NgbModalModule, 
  NgbProgressbarModule, 
  NgbTooltipModule 
} from '@ng-bootstrap/ng-bootstrap';
import { interval, Subscription, switchMap, takeWhile } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { CreditService } from '../../services/credit';
import { ToastService } from '../../../../services/toast.service';

@Component({
  selector: 'app-paiement-mobile',
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    NgbModalModule, 
    NgbProgressbarModule,
    NgbTooltipModule
  ],
  templateUrl: './paiement-mobile.html',
  styleUrl: './paiement-mobile.scss'
})
export class PaiementMobile implements OnInit, OnDestroy {

  achatId: string = '';
  achat: AchatCredit | null = null;
  paiementForm: FormGroup;
  loading = true;
  submitting = false;
  paymentInitiated = false;
  checkingStatus = false;
  error = '';
  pinCode = '';
  nouveauSolde = 0;
  private statusSubscription = new Subscription();
  private retryCount = 0;
  private maxRetries = 30;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private creditService: CreditService,
    private fb: FormBuilder,
    private modalService: NgbModal,
    private toastService: ToastService
  ) {
    this.paiementForm = this.fb.group({
      telephone: ['', [Validators.required, Validators.pattern('^[0-9]{9}$')]]
    });
  }

  ngOnInit(): void {
    this.achatId = this.route.snapshot.params['id'];
    this.chargerAchat();
  }

  ngOnDestroy(): void {
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
    }
  }

  chargerAchat(): void {
    this.creditService.getAchatDetail(this.achatId).subscribe({
      next: (achat) => {
        this.achat = achat;
        this.loading = false;
        
        // Si déjà confirmé, rediriger
        if (achat.statut === 'CONFIRME') {
          this.toastService.showInfo('Cet achat a déjà été confirmé.');
          this.router.navigate(['/credits/achater']);
        }
      },
      error: (err) => {
        this.error = "Impossible de charger les détails de l'achat";
        this.loading = false;
      }
    });
  }

  getOperatorName(): string {
    if (!this.achat) return '';
    switch (this.achat.methode_paiement) {
      case 'MTN_MOMO':
        return 'MTN Mobile Money';
      case 'ORANGE':
        return 'Orange Money';
      default:
        return 'Mobile Money';
    }
  }

  getOperatorColor(): string {
    if (!this.achat) return '#008753';
    switch (this.achat.methode_paiement) {
      case 'MTN_MOMO':
        return '#FCD116'; // Jaune MTN
      case 'ORANGE':
        return '#FF7900'; // Orange
      default:
        return '#008753';
    }
  }

  getOperatorIcon(): string {
    if (!this.achat) return 'bi-phone';
    switch (this.achat.methode_paiement) {
      case 'MTN_MOMO':
        return 'bi-motherboard';
      case 'ORANGE':
        return 'bi-apple';
      default:
        return 'bi-phone';
    }
  }

  getOperatorCode(): string {
    if (!this.achat) return '';
    switch (this.achat.methode_paiement) {
      case 'MTN_MOMO':
        return '+237';
      case 'ORANGE':
        return '+237';
      default:
        return '';
    }
  }

  get telephoneInvalid(): boolean {
    const control = this.paiementForm.get('telephone');
    return control?.invalid && (control?.dirty || control?.touched) ? true : false;
  }

  initierPaiement(): void {
    if (this.paiementForm.invalid) return;

    this.submitting = true;
    const telephone = this.paiementForm.value.telephone;

    // Simuler l'appel à l'API de paiement
    // Dans la réalité, vous appelleriez votre backend qui initie le paiement
    setTimeout(() => {
      this.submitting = false;
      this.paymentInitiated = true;
      
      // Simuler l'envoi d'une demande de paiement
      this.toastService.showInfo(`Demande de paiement envoyée au ${telephone}`);
    }, 2000);
  }

  verifierPaiement(): void {
    if (!this.pinCode || this.pinCode.length < 4) return;

    this.paymentInitiated = false;
    this.checkingStatus = true;
    this.retryCount = 0;

    // Simuler la vérification du paiement
    // Dans la réalité, vous interrogeriez votre backend
    this.statusSubscription = interval(3000).pipe(
      takeWhile(() => this.retryCount < this.maxRetries),
      switchMap(() => this.verifierStatutAchat())
    ).subscribe({
      next: (statut) => {
        if (statut.confirmed_at === 'CONFIRME') {
          this.paiementReussi();
        } else if (statut.confirmed_at === 'ECHEC') {
          this.paiementEchoue();
        }
        this.retryCount++;
      },
      error: () => {
        this.paiementEchoue('Erreur lors de la vérification du paiement');
      }
    });
  }

  verifierStatutAchat() {
    // Appel API pour vérifier le statut
    return this.creditService.getAchatDetail(this.achatId);
  }

  renvoyerCode(): void {
    this.toastService.showInfo('Nouveau code envoyé.');
    // Logique de renvoi de code
  }

  paiementReussi(): void {
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
    }
    
    this.checkingStatus = false;
    
    // Recharger l'achat pour obtenir le nouveau solde
    this.creditService.getSolde().subscribe({
      next: (solde) => {
        this.nouveauSolde = solde.solde;
        //this.modalService.open(this.confirmationModal, {
        //  centered: true,
        //  backdrop: 'static'
        //});
      }
    });
  }

  paiementEchoue(message: string = 'Le paiement a échoué'): void {
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
    }
    
    this.checkingStatus = false;
    this.errorMessage = message;
    //this.modalService.open(this.erreurModal, { centered: true });
  }

  annuler(): void {
    this.router.navigate(['/credits/achat']);
  }

  aide(): void {
    this.toastService.showInfo('Contactez le support au +237 123 456 789.');
  }

  reessayer(): void {
    this.modalService.dismissAll();
    this.paymentInitiated = true;
    this.error = '';
  }

  fermerEtRetour(): void {
    this.modalService.dismissAll();
    this.router.navigate(['/credits/achat']);
  }

  errorMessage: string = '';
}
