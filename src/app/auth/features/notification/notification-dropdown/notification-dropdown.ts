import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { SNotification } from '../notification-service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgbDropdownModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NotificationClient } from '../notification-model';
import { 
  NotificationDetailModal 
} from '../notification-detail-modal/notification-detail-modal';
import { 
  AdministrationNotificationService 
} from '../../../../components/administration-lango/admin-notification.service';
import { 
  Subscription 
} from 'rxjs';

@Component({
  selector: 'app-notification-dropdown',
  imports: [CommonModule, RouterModule, NgbDropdownModule],
  templateUrl: './notification-dropdown.html',
  styleUrl: './notification-dropdown.scss'
})
export class NotificationDropdown implements OnInit, OnDestroy {

  private notifService = inject(SNotification);

  private svc   = inject(AdministrationNotificationService);

  private modal = inject(NgbModal);
  private sub   = new Subscription();

  notifications = this.notifService.notifications;
  unreadCount = this.notifService.unreadCount;

  ngOnInit() {}

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  /**
   * Ouvrir une notification en modal
   */
  openNotification(notif: NotificationClient, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const modalRef = this.modal.open(NotificationDetailModal, {
      size: 'lg',
      centered: true,
      backdrop: 'static'
    });

    if (!notif.lue) {
      this.notifService.markAsRead(notif.id).subscribe();
    }

    modalRef.componentInstance.notification = notif;

    modalRef.result.then(
      (result) => { if (result === 'deleted' || result === 'read') { } },
      (reason) => { console.log('Modal annulée:', reason); }
    );
  }

  // ── Couleurs par type (pour le template redesigné) ────────────
  getIconColor(type: string): string {
    const map: Record<string, string> = {
      VERIFICATION:    '#3b82f6',
      CORRECTION:      '#f59e0b',
      VALIDATION:      '#008753',
      REJET:           '#ef4444',
      INFO:            '#6366f1',
      SYSTEM:          '#6b7280',
      DOCUMENT_REQUIS: '#7c3aed',
      ACTION_REQUISE:  '#f97316',
      RAPPEL:          '#0891b2',
    };
    return map[type] ?? '#6b7280';
  }

  getIconBg(type: string): string {
    const map: Record<string, string> = {
      VERIFICATION:    '#eff6ff',
      CORRECTION:      '#fffbeb',
      VALIDATION:      '#f0fdf4',
      REJET:           '#fef2f2',
      INFO:            '#eef2ff',
      SYSTEM:          '#f9fafb',
      DOCUMENT_REQUIS: '#f5f3ff',
      ACTION_REQUISE:  '#fff7ed',
      RAPPEL:          '#ecfeff',
    };
    return map[type] ?? '#f9fafb';
  }

  // Conservé pour compatibilité si utilisé ailleurs
  getBadgeClass(type: string): string {
    const map: Record<string, string> = {
      VERIFICATION:    'bg-primary',
      CORRECTION:      'bg-warning text-dark',
      VALIDATION:      'bg-success',
      REJET:           'bg-danger',
      INFO:            'bg-info',
      SYSTEM:          'bg-secondary',
      DOCUMENT_REQUIS: 'bg-purple',
      ACTION_REQUISE:  'bg-orange',
      RAPPEL:          'bg-cyan',
    };
    return map[type] ?? 'bg-secondary';
  }

  markAsRead(id: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.notifService.markAsRead(id).subscribe();
  }

  markAllAsRead() {
    this.svc.marquerToutesLues().subscribe();
  }

}
