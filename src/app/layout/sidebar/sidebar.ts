import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AuthService } from '../../auth/core/auth.service';
import { 
  LanguageSelector 
} from "../../components/language/language-selector/language-selector";
import { NgbModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { 
  ConfirmationService 
} from '../../components/confirmation-modal/service/confirmation';


@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LanguageSelector, NgbTooltipModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.scss']
})
export class Sidebar implements OnInit {

  timeCopy = (new Date()).getFullYear();

  // largeur du sidebar (px) — change ici si besoin
  readonly COLLAPSED = 56;
  readonly EXPANDED  = 280;

  // état UI
  isOpen = signal(false);
  // control cross visibility separately for polish: 
  // appears after open completes, hides immediately on close
  isCrossVisible = signal(false);
  private _crossTimer: any = null;

  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private modal = inject(NgbModal);
  private confirmation = inject(ConfirmationService)

  // optionnel : démarrer fermé avec la largeur cohérente
  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.style.setProperty(
        '--sidebar-width', `${this.COLLAPSED}px`
      );
    }
  }
  toggleSidebar() {
    // clear any pending timer so it won't re-show the cross after a close
    if (this._crossTimer) { clearTimeout(this._crossTimer); this._crossTimer = null; }

    const opening = !this.isOpen();

    // debug: log toggle attempts
    try { console.debug('[Sidebar] toggleSidebar called, opening=', opening); } 
    catch (e) { /* noop */ }

    if (opening) {
      // open: set open state immediately, set width, then schedule cross visibility
      this.isOpen.set(true);
      if (isPlatformBrowser(this.platformId)) {
        document.documentElement.style.setProperty(
          '--sidebar-width', `${this.EXPANDED}px`
        );
      }
      this._crossTimer = setTimeout(() => { this.isCrossVisible.set(true); 
        this._crossTimer = null; }, 220);
    } else {
      // close: hide cross immediately, then set open=false and collapse width
      this.isCrossVisible.set(false);
      this.isOpen.set(false);
      if (isPlatformBrowser(this.platformId)) {
        document.documentElement.style.setProperty(
          '--sidebar-width', `${this.COLLAPSED}px`
        );
      }
    }
  }

  menus = [
    { label: 'Accueil', path: '/home' },
    { label: 'Code de référence', path: '/reference-code', 
      roles: ['Admin', 'Secretariat', 'Comptable'] 
    },
    { label: 'Users', path: '/users', 
      roles: ['Admin'] 
    }
  ];

  private auth = inject(AuthService);

  hasRole(required?: string[]) {
    if (!required || required.length === 0) return true;
    try {
      return this.auth.hasRole(required) as boolean;
    } catch {
      return false;
    }
  }

  user = () => this.auth.user();

  async onLogout() {
    const confirmed = await this.confirmation.confirm({
      title: 'Déconnexion',
      message: 'Êtes-vous sûr de vouloir vous déconnecter ?',
      type: 'bg-warning',
      icon: 'bi-box-arrow-right'
    });

    if (!confirmed) return;

    try {
      this.logout();
    } finally {}
  }

  logout(): void {
    this.auth.logout();
  }
}