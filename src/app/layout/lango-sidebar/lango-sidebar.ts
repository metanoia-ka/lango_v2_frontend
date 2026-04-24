import { Component, inject, signal } from '@angular/core';
import { Authentication } from '../../auth/core/authentication';
import { SIDEBAR_ITEMS, SidebarItem } from '../siderbar.config';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { SidebarService } from '../service/sidebar.service';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { animate, style, transition, trigger } from '@angular/animations';
import { filter, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-lango-sidebar',
  imports: [CommonModule, RouterModule, NgbTooltipModule],
  templateUrl: './lango-sidebar.html',
  styleUrl: './lango-sidebar.scss',
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(-100%)' }),
        animate('300ms ease-out', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(-100%)' }))
      ])
    ]),
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('rotateChevron', [
      transition(':enter', [
        style({ transform: 'rotate(0deg)' }),
        animate('300ms ease-out', style({ transform: 'rotate(180deg)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'rotate(0deg)' }))
      ])
    ])
  ]
})
export class LangoSidebar {

  auth = inject(Authentication);
  sidebar = inject(SidebarService);
  private router = inject(Router);
  
  private destroy$ = new Subject<void>();

  // Items chargés dynamiquement
  sidebarItems = signal<SidebarItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // État de l'utilisateur
  user = this.auth.currentUserSignal;
  currentRoute = signal('');

  ngOnInit() {
    // Charger les items du sidebar
    this.loadSidebarItems();

    // Surveiller la navigation pour mettre à jour l'item actif
    this.router.events
    .pipe(
      takeUntil(this.destroy$),
      filter(event => event instanceof NavigationEnd)
    )
    .subscribe((event: NavigationEnd) => {
      this.currentRoute.set(event.urlAfterRedirects);
    });

    this.auth.currentUser$.subscribe(user => {
      this.user.set(user);
    });
  }

  private async loadSidebarItems() {
    try {
      this.loading.set(true);
      // Lazy loading des items
      this.sidebarItems.set(SIDEBAR_ITEMS);
    } catch (err) {
      this.error.set('Impossible de charger le menu');
    } finally {
      this.loading.set(false);
    }
  }

  canShow(item: SidebarItem): boolean {

    const currentUser = this.user();
  
    // Vérifier l'authentification
    if (item.requiresAuth && !currentUser) {
      return false;
    }

    // NOUVEAU : Vérifier les rôles exclus (prioritaire)
    if (item.hiddenForRoles && item.hiddenForRoles.length > 0 && currentUser?.roles) {
      const userRoles = currentUser.roles;
      const hasExcludedRole = item.hiddenForRoles.some(role => 
        userRoles.includes(role)
      );
      if (hasExcludedRole) {
        return false;  // L'utilisateur a un rôle exclu → cacher l'item
      }
    }
  
    // Vérifier les rôles
    if (item.roles && item.roles.length > 0) {
      if (!currentUser?.roles || !this.auth.hasAnyRole(item.roles)) {
        return false;
      }
    }

    return true;
  }

  isActive(route?: string): boolean {
    if (!route) return false;
    return this.currentRoute() === route || this.currentRoute().startsWith(route);
  }

  toggleSidebar() {
    this.sidebar.toggle();
  }

  closeSidebar() {
    this.sidebar.close();
  }

  onLogout() {
    this.auth.logout().subscribe();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
