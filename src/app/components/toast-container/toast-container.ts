import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Toast, ToastService } from '../../services/toast.service';
import { 
  NotificationModalService 
} from '../../auth/features/notification/notification-modal-service';
import { SNotification } from '../../auth/features/notification/notification-service';

@Component({
  selector: 'app-toast-container',
  imports: [CommonModule],
  template: `
    <div class="toast-container-custom">
      @for (toast of toastSvc.activeToasts; track toast) {
        <div class="toast-item"
             [class]="'toast-' + toast.type"
             role="alert" aria-live="assertive" aria-atomic="true"
             [class.cursor-pointer]="toast.data?.notificationId"
             (click)="handleClick(toast)">
          <div class="toast-icon">
            <i class="bi" [class]="getIcone(toast.type)"></i>
          </div>
          <div class="toast-body">
            <span class="toast-label">{{ getLabel(toast.type) }}</span>
            <span class="toast-msg">{{ toast.message }}</span>
          </div>
          <button type="button" class="btn-close btn-close-danger me-2 m-auto" 
                  (click)="toastSvc['remove'](toast); 
                  $event.stopPropagation()"></button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container-custom {
      position: fixed;
      top: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      pointer-events: none;
    }

    .toast-item {
      display: flex;
      align-items: flex-start;
      gap: 0.625rem;
      padding: 0.75rem 1rem;
      border-radius: 10px;
      min-width: 280px;
      max-width: 380px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.12);
      animation: toastIn 0.25s cubic-bezier(.34,1.56,.64,1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13.5px;
      pointer-events: auto;
      border: 1px solid transparent;
    }

    @keyframes toastIn {
      from { transform: translateX(100%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }

    .toast-success {
      background: #f0fdf4;
      border-color: #b3d9c8;
      color: #008753;
    }
    .toast-error {
      background: #fef2f2;
      border-color: #fecaca;
      color: #dc2626;
    }
    .toast-warning {
      background: #fffbeb;
      border-color: #fde68a;
      color: #d97706;
    }
    .toast-info {
      background: #eef2ff;
      border-color: #c7d2fe;
      color: #4338ca;
    }

    .toast-icon {
      font-size: 16px;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .toast-body {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      min-width: 0;
    }

    .toast-label {
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.75;
    }

    .toast-msg {
      font-size: 13px;
      font-weight: 500;
      line-height: 1.4;
      word-break: break-word;
    }
  `]
})
export class ToastContainer {

  toastSvc = inject(ToastService);
  notifModalService = inject(NotificationModalService);
  notifService = inject(SNotification);

  handleClick(toast: Toast) {
    if (toast.data?.notificationId) {
      // Récupérer la notification complète depuis le service (elle est déjà en cache)
      const notif = this.notifService.notifications().find(
        n => n.id === toast.data.notificationId
      );

      if (notif) {
        // Option 1 : ouvrir directement la modal (recommandé)
        this.notifModalService.openNotification(notif);

        // Option 2 (alternative) : aller vers la page notifications avec ID
        // this.router.navigate(
        // ['/notifications'], { queryParams: { id: toast.data.notificationId } });

        // Marquer comme lue (optionnel)
        this.notifService.markAsRead(notif.id).subscribe();

        // Supprimer le toast après clic
        this.toastSvc['remove'](toast);
      } else {
        console.warn('Notification non trouvée dans le cache:', toast.data.notificationId);
        // Fallback : aller vers la page notifications
        //this.router.navigate(['/notifications']);
      }
    }
  }

  getIcone(type: string): string {
    const map: Record<string, string> = {
      success: 'bi-check-circle-fill',
      error:   'bi-x-circle-fill',
      warning: 'bi-exclamation-triangle-fill',
      info:    'bi-info-circle-fill',
    };
    return map[type] ?? 'bi-bell-fill';
  }

  getLabel(type: string): string {
    const map: Record<string, string> = {
      success: 'Succès',
      error:   'Erreur',
      warning: 'Attention',
      info:    'Information',
    };
    return map[type] ?? 'Notification';
  }
}
