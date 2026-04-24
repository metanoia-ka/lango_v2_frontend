import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Connection } from '../service/connexion-status';
import { debounceTime, distinctUntilChanged, Subscription, timer } from 'rxjs';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-connexion-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './connexion-status.html',
  styleUrl: './connexion-status.scss',
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-100%)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(-100%)' }))
      ])
    ])
  ]
})
export class ConnectionStatus implements OnInit, OnDestroy {

  isOnline: boolean = true;

  showOnlineBanner = false;
  showOfflineBanner = false;
  
  // Timer pour masquer la bannière en ligne
  private onlineBannerTimer?: any;

  private connectionService = inject(Connection);
  private subscription = new Subscription();

  ngOnInit(): void {
    this.subscription.add(
      this.connectionService.isOnline$.pipe(
        distinctUntilChanged(), // Évite les déclenchements inutiles
        debounceTime(300) // Anti-rebond pour les changements rapides
      )
      .subscribe(status => {
        this.handleConnectionChangeWithObservable(status);
      })
    );
  }

  private handleConnectionChangeWithObservable(isOnline: boolean): void {
    if (isOnline) {
      this.isOnline = true;
      this.showOnlineBanner = true;
      this.showOfflineBanner = false;
      
      // Utiliser timer RxJS au lieu de setTimeout
      this.subscription.add(
        timer(10000).subscribe(() => {
          this.showOnlineBanner = false;
        })
      );
    } else {
      this.isOnline = false;
      this.showOnlineBanner = false;
      this.showOfflineBanner = true;
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    if (this.onlineBannerTimer) {
      clearTimeout(this.onlineBannerTimer);
    }
  }
}