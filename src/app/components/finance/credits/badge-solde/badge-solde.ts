import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CreditService } from '../../services/credit';
import { Authentication } from '../../../../auth/core/authentication';
import { ToastService } from '../../../../services/toast.service';
import { SNotification } from '../../../../auth/features/notification/notification-service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-badge-solde',
  imports: [CommonModule],
  templateUrl: './badge-solde.html',
  styleUrl: './badge-solde.scss'
})
export class BadgeSolde implements OnInit, OnDestroy {

  private creditService   = inject(CreditService);
  private auth            = inject(Authentication);
  private notificationSvc = inject(SNotification);
  private toast           = inject(ToastService);

  private destroy$ = new Subject<void>();

  solde = this.creditService.solde;

  ngOnInit(): void {
    // ── Charger le solde initial ──────────────────────────────────────────────
    if (this.auth.currentUserSignal()) {
      this.creditService.getSolde().subscribe();
    }

    // ── Réagir aux changements de connexion ───────────────────────────────────
    this.auth.currentUser$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      if (user) {
        this.creditService.getSolde().subscribe();
      } else {
        this.creditService.solde.set(0);
      }
    });

    // ── FIX : s'abonner à creditUpdate$ IMMÉDIATEMENT (pas seulement à la connexion)
    // Avec ReplaySubject(1), le dernier message WS est rejoué même si on s'abonne tard.
    this.notificationSvc.creditUpdate$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(data => {
      // 1. Mettre à jour le solde dans le signal global
      this.creditService.solde.set(data.nouveau_solde);

      // 2. Toast de confirmation
      this.toast.showSuccess(`🎉 ${data.message}`);
    });

  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
