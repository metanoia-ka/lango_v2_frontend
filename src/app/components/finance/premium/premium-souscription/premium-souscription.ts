import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CreditService } from '../../services/credit';
import { AbonnementService } from '../../services/abonnement';
import { Authentication } from '../../../../auth/core/authentication';

@Component({
  selector: 'app-premium-souscription',
  imports: [CommonModule, RouterModule],
  templateUrl: './premium-souscription.html',
  styleUrl: './premium-souscription.scss'
})
export class PremiumSouscription implements OnInit {

  private creditSvc  = inject(CreditService);
  private aboSvc     = inject(AbonnementService);
  private auth       = inject(Authentication);
  private router     = inject(Router);

  solde         = this.creditSvc.solde;
  abonnement    = this.aboSvc.abonnement;
  isLoading     = signal(true);

  // Conditions d'accès
  aDesCredits     = signal(false);
  aUnAbonnement   = signal(false);

  ngOnInit(): void {
    // Charger l'état actuel
    this.creditSvc.getSolde().subscribe({
      next: () => {
        this.aDesCredits.set(this.solde() > 0);
        this._verifierAcces();
      }
    });

    this.aboSvc.getMonAbonnement().subscribe({
      next: () => {
        this.aUnAbonnement.set(this.abonnement()?.est_actif ?? false);
        this._verifierAcces();
      },
      error: () => {
        this.aUnAbonnement.set(false);
        this._verifierAcces();
      }
    });
  }

  private _verifierAcces(): void {
    this.isLoading.set(false);
    // Si l'utilisateur a déjà des crédits → rediriger vers le dashboard
    if (this.aDesCredits()) {
      this.router.navigate(['/lango/premium']);
    }
  }

  // Helpers template
  get user() { return this.auth.currentUserSignal(); }

  isVendor()    { return this.auth.hasRole('Vendor'); }
  isPurchaser() { return this.auth.hasRole('Purchaser'); }
  isAdmin()     { return this.auth.hasAnyRole(['Admin', 'Manager']); }

  readonly tarifs = [
    { 
      icon: 'bi-file-earmark-text-fill', 
      label: 'Fiche parcelle complète',  
      cout: 5,  
      color: '#4f46e5' 
    },
    { 
      icon: 'bi-diagram-3-fill', 
      label: 'Chaîne foncière', 
      cout: 8, 
      color: '#16a34a' 
    },
    { icon: 'bi-calendar-check-fill', 
       label: 'Réservation parcelle', 
       cout: 25, 
       color: '#d97706' 
      },
    { icon: 'bi-folder2-open', 
      label: 'Dossier foncier complet', 
      cout: 20, 
      color: '#7c3aed' 
    },
    { 
      icon: 'bi-chat-dots-fill', 
      label: 'Contact propriétaire', 
      cout: 15, 
      color: '#2563eb' 
    },
    { icon: 'bi-bell-fill', 
      label: 'Alerte disponibilité', 
      cout: 3, 
      color: '#ca8a04' 
    },
    { 
      icon: 'bi-eye-fill',
      label: 'Détail annonce illimité', 
      cout: 1, 
      color: '#008753' 
    },
  ];

}
