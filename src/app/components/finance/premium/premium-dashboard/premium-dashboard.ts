import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MesReservations, } from '../mes-reservations/mes-reservations';
import { MesContacts } from '../mes-contacts/mes-contacts';
import { MesAlertes } from '../mes-alertes/mes-alertes';
import { MesDossiers } from '../mes-dossiers/mes-dossiers';
import { Authentication } from '../../../../auth/core/authentication';
import { PremiumService } from '../../services/premium';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { CreditService } from '../../services/credit';

type OngletPremium = 'réservations' | 'dossiers' | 'contacts' 
                      | 'alertes' | 'fiche parcelle complète'
                      | 'chaîne foncière' | 'détail annonce illimité';

@Component({
  selector: 'app-premium-dashboard',
  imports: [
    CommonModule, RouterModule, NgbTooltipModule,
    MesReservations, MesDossiers, MesContacts, MesAlertes
  ],
  templateUrl: './premium-dashboard.html',
  styleUrl: './premium-dashboard.scss'
})
export class PremiumDashboard implements OnInit {

  onglet = signal<OngletPremium>('réservations');
 
  protected auth    = inject(Authentication);
  private   premSvc = inject(PremiumService);
  private creditSvc = inject(CreditService);

  solde              = this.creditSvc.solde;
  afficherBandeauTarifs = signal(true);

  reservations = this.premSvc.reservations;
  dossiers     = this.premSvc.dossiers;
  contacts     = this.premSvc.contacts;
  alertes      = this.premSvc.alertes;
 
  isAdminOrManager = this.auth.hasAnyRole(['Admin', 'Manager']);

  ngOnInit(): void {
    const deja_vu = localStorage.getItem('lango_premium_bandeau_vu');
    if (deja_vu) this.afficherBandeauTarifs.set(false);
  }

  fermerBandeau(): void {
    this.afficherBandeauTarifs.set(false);
    // Mémoriser en localStorage pour ne pas ré-afficher à chaque visite
    localStorage.setItem('lango_premium_bandeau_vu', '1');
  }
 
  changerOnglet(o: OngletPremium): void {
    this.onglet.set(o);
  }
 
  readonly tabs: { 
    key: OngletPremium; label: string; icon: string; cout: string 
  }[] = [
    { key: 'réservations', 
      label: 'Réservations', 
      icon: 'bi-calendar-check-fill', 
      cout: '25 cr.' 
    },
    { key: 'dossiers', 
      label: 'Dossiers', 
      icon: 'bi-folder2-open', 
      cout: '20 cr.' 
    },
    { key: 'contacts', 
      label: 'Contacts', 
      icon: 'bi-chat-dots-fill', 
      cout: '15 cr.' 
    },
    { key: 'alertes', 
      label: 'Alertes', 
      icon: 'bi-bell-fill', 
      cout: '3 cr.' 
    },
    { 
      icon: 'bi-eye-fill',
      label: 'Détails annonce', 
      cout: '100 cr.', 
      key: 'détail annonce illimité' 
    },
    { 
      icon: 'bi-diagram-3-fill', 
      label: 'Chaîne foncière', 
      cout: '8 cr.', 
      key: 'chaîne foncière' 
    },
    { 
      key: 'fiche parcelle complète',
      icon: 'bi-file-earmark-text-fill', 
      label: 'Fiche parcelle',  
      cout: '12 cr.',
    }
  ];

}
