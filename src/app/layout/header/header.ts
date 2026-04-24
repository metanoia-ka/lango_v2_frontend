import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Authentication } from '../../auth/core/authentication';
import { RouterModule } from '@angular/router';
import { 
  NotificationDropdown 
} from '../../auth/features/notification/notification-dropdown/notification-dropdown';
import { 
  LanguageSelector 
} from '../../components/language/language-selector/language-selector';
import { BadgeSolde } from '../../components/finance/credits/badge-solde/badge-solde';
import { MessagingForm } from '../../components/messaging/messaging-form/messaging-form';
import { 
  ConfirmationService 
} from '../../components/confirmation-modal/service/confirmation';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-header',
  imports: [
    CommonModule, 
    RouterModule, 
    NotificationDropdown,
    LanguageSelector,
    BadgeSolde
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {

  protected auth = inject(Authentication);
  private confirmation = inject(ConfirmationService);
  
  private readonly modal = inject(NgbModal);
  user = this.auth.currentUserSignal;
  isAdmin = this.auth.hasAnyRole(['Admin', 'Manager']);
  isAgent = this.auth.hasRole('Agent');

  isAuthLoading = this.auth.isLoadingAuth;

  onLogout() {
    this.auth.logout().subscribe();
  }

  contactTeam(): void {
    const ref = this.modal.open(MessagingForm, { size: 'md', centered: true });
    ref.result.then(r => { 
      if (r === 'saved') { 
        this.confirmation.inform({
          context: 'create',
          title:   'Contacter l\'équipe',
          type:    'bg-success',
          closeLabel: 'Ok',
          message: `
          Merci de nous avoir contactés. Votre demande a bien été enregistrée et
          notre équipe vous répondra dans les meilleurs délais.`,
        });
      }
    }, () => {});
  }
}
