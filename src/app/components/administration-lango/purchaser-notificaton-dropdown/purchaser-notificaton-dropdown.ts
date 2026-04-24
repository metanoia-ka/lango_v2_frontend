import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbDropdownModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AdministrationNotificationService } from '../admin-notification.service';
import { Subscription } from 'rxjs';
import { NotifClient, NotificationType } from '../admin-notification.model';
import { 
  NotificationActionModal 
} from '../notification-action-modal/notification-action-modal';

@Component({
  selector: 'app-purchaser-notificaton-dropdown',
  imports: [CommonModule, RouterModule, NgbDropdownModule],
  templateUrl: './purchaser-notificaton-dropdown.html',
  styleUrl: './purchaser-notificaton-dropdown.scss'
})
export class PurchaserNotificatonDropdown implements OnInit, OnDestroy {

  private svc = inject(AdministrationNotificationService);
  private modal = inject(NgbModal);
  private sub = new Subscription();

  notifications = this.svc.notifications;
  nonLues = this.svc.nonLues;
  wsConnecte = this.svc.wsConnecte;

  // Les 10 plus récentes dans le dropdown
  recentes = computed(() => this.notifications().slice(0, 10));

  // Pour afficher le "pulse" sur la cloche à l'arrivée d'une nouvelle notif
  nouvelleNotif = signal(false);

  ngOnInit(): void {
    // Charger depuis l'API REST au démarrage
    this.sub.add(this.svc.charger().subscribe());

    // Animer la cloche à chaque nouvelle notif WebSocket
    this.sub.add(
      this.svc.nouvelleNotif$.subscribe(() => {
        this.nouvelleNotif.set(true);
        setTimeout(() => this.nouvelleNotif.set(false), 3000);
      })
    );
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  // Clic sur une notification
  onClickNotif(notif: NotifClient): void {
    if (!notif.lue) {
      this.svc.marquerLue(notif.id).subscribe();
    }
    // Si la notif demande une action → ouvrir la modale de réponse
    if (notif.data?.type_action) {
      this._ouvrirModaleReponse(notif);
    }
  }

  private _ouvrirModaleReponse(notif: NotifClient): void {
    const ref = this.modal.open(NotificationActionModal, {
      size: 'md',
      centered: true,
      backdrop: 'static',
      keyboard: false
    });
    ref.componentInstance.notification = notif;
    ref.result
      .then(() => { /* soumis */ })
      .catch(() => { /* annulé */ });
  }

  marquerToutesLues(): void {
    this.svc.marquerToutesLues().subscribe();
  }

  supprimer(notif: NotifClient, e: Event): void {
    e.stopPropagation();
    this.svc.supprimer(notif.id).subscribe();
  }

  getMeta(type: NotificationType) {
    return this.svc.getMeta(type);
  }

  hasAction(notif: NotifClient): boolean {
    return !!notif.data?.type_action;
  }

  getActionLabel(notif: NotifClient): string {
    const map: Record<string, string> = {
      fournir_documents: '📎 Docs requis',
      confirmer_action:  '✋ Action requise',
      ouvrir_conversation: '💬 Conversation',
      voir_annonce: '🏠 Voir annonce',
      lien_externe: '↗ Lien',
    };
    return notif.data?.type_action ? (map[notif.data.type_action] ?? 'Action') : '';
  }
}
