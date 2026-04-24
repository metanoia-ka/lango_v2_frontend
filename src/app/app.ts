import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { Router, NavigationEnd, RouterModule, RouterOutlet } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { inject } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { Authentication } from './auth/core/authentication';
import { SNotification } from './auth/features/notification/notification-service';
import { ToastContainer } from './components/toast-container/toast-container';
import { CreditService } from './components/finance/services/credit';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ CommonModule,
    RouterModule, RouterOutlet,
    ToastContainer
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {

  isAuthPage = false;
  private isBrowser!: boolean;
  private readonly LAST_ROUTE = 'last_route';
  
  private destroy$ = new Subject<void>();
  
  private notifService = inject(SNotification);
  public authentication = inject(Authentication);
  private creditService = inject(CreditService);
  //solde = this.creditService.solde;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (isPlatformBrowser(this.platformId)) {
      this.router.events.pipe(takeUntil(this.destroy$)).subscribe(event => {
        if (event instanceof NavigationEnd) {
          const url = (event as NavigationEnd).urlAfterRedirects 
                      || (event as NavigationEnd).url;
          this.isAuthPage = ['/login', '/register', '/unauthorized']
                            .some(p => url.startsWith(p));
        }
      });
      this.lastRouterNavigation();
    }
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.notifService.connectWebSocket();
    }
    this.creditService.solde;
  }

  private lastRouterNavigation(): void {
    this.router.events.subscribe(event => {
      
      if (event instanceof NavigationEnd) {
        const url = event.urlAfterRedirects;
      
        // Ne pas sauvegarder les pages auth comme dernière route
        const isAuthPage = ['/auth/login', '/auth/register', '/unauthorized']
                           .some(p => url.startsWith(p));
        
        if (!isAuthPage) {
          localStorage.setItem(this.LAST_ROUTE, url);
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.notifService.deconnecterWS();
  }
}