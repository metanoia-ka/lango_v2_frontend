import { inject, Injectable } from "@angular/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { NotificationClient } from "./notification-model";
import { 
  NotificationDetailModal 
} from "./notification-detail-modal/notification-detail-modal";

@Injectable({ providedIn: 'root' })
export class NotificationModalService {
  private modal = inject(NgbModal);

  openNotification(notif: NotificationClient): void {
    const modalRef = this.modal.open(NotificationDetailModal, {
      size: 'lg',
      centered: true,
      backdrop: 'static'
    });

    modalRef.componentInstance.notification = notif;

    modalRef.result.then(
      (result) => {
        console.log('Modal fermée avec résultat:', result);
      },
      (reason) => {
        console.log('Modal annulée:', reason);
      }
    );
  }
}