import { HttpClient } from "@angular/common/http";
import { inject, Injectable, PLATFORM_ID, signal } from "@angular/core";
import { environnement } from "../../../../environnements/environnement";
import { catchError, Observable, ReplaySubject, Subject, tap } from "rxjs";
import { NotificationClient, NotificationType } from "./notification-model";
import { isPlatformBrowser } from '@angular/common';
import {
  NotificationStats, 
  ReponseNotification
} from "../../../components/administration-lango/admin-notification.model";
import { ToastService } from "../../../services/toast.service";
import { CreditService } from "../../../components/finance/services/credit";

export interface CreditUpdateData {
  nouveau_solde:   number;
  credits_ajoutes: number;
  motif:           string;
  message:         string;
}

@Injectable({ providedIn: 'root' })
export class SNotification {

  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  notifications = signal<NotificationClient[]>([]);

  private creditService = inject(CreditService);
  private toast = inject(ToastService);

  private _nouvelleNotif$ = new Subject<NotificationClient>();
  nouvelleNotif$ = this._nouvelleNotif$.asObservable();

  private creditUpdateSubject = new Subject<any>();
  //creditUpdate$ = this.creditUpdateSubject.asObservable();
  creditUpdate$ = new ReplaySubject<CreditUpdateData>(1);

  unreadCount = signal(0);
  wsConnecte = signal(false);
  private lastSoundPlayed = 0;

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5
  private ws: WebSocket | null = null;

  private apiUrl = `${environnement.apiBaseUrl}/notification/`;
  private readonly WS_URL = `${environnement.wsBaseUrl}/notifications/`;
  
  constructor() {
    this.connectWebSocket();
  }

  private playSound() {
    const now = Date.now();
    if (now - this.lastSoundPlayed < 1500) return;

    this.lastSoundPlayed = now;

    try {
      const audio = new Audio('/assets/sounds/notification.ogg');
      audio.volume = 0.35;
      audio.play().catch(() => {});
    } catch {}
  }

  onNewNotification(notif: NotificationClient) {
    this.notifications.update(current => [notif, ...current]);

    // ── AFFICHAGE TOAST ────────────────────────────────
    this.toast.showNotification(
      notif.titre || notif.message.substring(0, 60) + '...',
      10000,
      { notificationId: notif.id }
    );

    if (!notif.lue) {
      this.playSound();
    }

    this._nouvelleNotif$.next(notif);
    this._afficherToast(notif!); 
  }

  // Charger les notifications initiales
  loadNotifications(): Observable<NotificationClient[]> {
    return this.http.get<NotificationClient[]>(
      this.apiUrl, { withCredentials: true }
    ).pipe(
      tap(data => {
        const mapped = data.map(n => this._mapNotif(n));
        this.notifications.set(mapped);
      this.unreadCount.set(mapped.filter(n => !n.lue).length);

        if (this.unreadCount() > 0) {
          this.playSound();
          this.toast.showNotification(
           `Vous avez ${this.unreadCount()} 
            notification${this.unreadCount() > 1 ? 's' : ''} 
            non lue${this.unreadCount() > 1 ? 's' : ''}`,
            7000
          );
        } 
        //else {
        //  this.toast.showInfo("Aucune nouvelle notification", 7000);
        //}
      }),
      catchError(err => { return []; })
    );
  }

  getNotificationById(id: string): Observable<NotificationClient> {
    return this.http.get<NotificationClient>(
      `${this.apiUrl}${id}/`, { withCredentials: true }
    );
  }

  deleteNotification(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}${id}/`, { withCredentials: true }).pipe(
      tap(() => {
        this.notifications.update(notifs => notifs.filter(n => n.id !== id));
        this.unreadCount.update(c => Math.max(0, c - 1));
      })
    );
  }

  connectWebSocket(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    if (this.ws && 
      (this.ws.readyState === WebSocket.OPEN || 
       this.ws.readyState === WebSocket.CONNECTING
      )
    ) { return; }

    this.ws = new WebSocket(this.WS_URL);

    // Événement : Connexion ouverte
    this.ws.onopen = (event) => {
      this.wsConnecte.set(true);
      this.reconnectAttempts = 0;
    };

    // Événement : Message reçu
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Gestion du PING/PONG
      if (data.type === 'ping') {
        this.ws?.send(JSON.stringify({ action: 'pong' }));
        return;
      }

      if (data.type === 'CREDIT_UPDATE') {
        this.creditUpdateSubject.next(data.data);
        this.creditService.solde.set(data.nouveau_solde);
        this.toast.showSuccess(data.message);
        this.creditService.getMesAchats().subscribe();
        return;
      }

      if (data.type === 'NOUVEAU_MESSAGE') {
        this.toast.showInfo(
          `📩 Nouveau message de ${data.payload.sender_nom} : ${data.payload.objet}`,
          6000
        );
      }

      if (data.type === 'initial') {
        this.unreadCount.set(data.unread_count);
        this.loadNotifications().subscribe();
      } 
      
      if ( data.type === 'new_notification') {
        const notif = this._mapNotif(data.notification);
        
        this.onNewNotification(notif);

        this.unreadCount.update(count => count + 1);

        return;
      }

      if (data.type === 'unread_count') {
        this.unreadCount.set(data.unread_count);
      }
    };

    // Événement : Erreur
    this.ws.onerror = (error) => {
      this.wsConnecte.set(false);
    };

    // Événement : Connexion fermée
    this.ws.onclose = (event) => {
      
      this.ws = null;
      
      // Reconnexion automatique
      if (event.code !== 1000 
          && event.code !== 4003 
          && this.reconnectAttempts < this.maxReconnectAttempts
        ) {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        setTimeout(() => this.connectWebSocket(), delay);
      }
    };
  }

  // ── Toast selon le type de notif ─────────────────────────────
  private _afficherToast(notif: NotificationClient): void {
    // Message affiché : titre + début du message
    const msg = `${notif.titre} — ${
      notif.message.length > 60
        ? notif.message.substring(0, 60) + '…'
        : notif.message
    }`;

    switch (notif.type) {
      case 'VALIDATION':
        this.toast.showSuccess(msg);
        break;
      case 'REJET':
      case 'CORRECTION':
        this.toast.showError(msg, 8000);
        break;
      case 'VERIFICATION':
      case 'DOCUMENT_REQUIS':
      case 'ACTION_REQUISE':
      case 'RAPPEL':
        this.toast.showWarning(msg, 6000);
        break;
      case 'INFO':
      case 'SYSTEM':
      default:
        this.toast.showInfo(msg);
        break;
    }
  }

  deconnecterWS(): void {
    this.ws?.close(1000);
    this.ws = null;
    this.wsConnecte.set(false);
  }

  markAsRead(id: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}${id}/marquer_lue/`,
      {}, 
      { withCredentials: true }
    ).pipe(
      tap(() => {
        this.notifications.update(notifs => 
          notifs.map(n => n.id === id ? { ...n, lue: true } : n)
        );
        this.unreadCount.update(c => Math.max(0, c - 1));
      })
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.post(
      `${this.apiUrl}marquer_toutes_lues/`, { withCredentials: true }
    ).pipe(
      tap(() => {
        this.notifications.update(notifs => notifs.map(n => ({ ...n, lue: true })));
        this.unreadCount.set(0);
      })
    );
  }

  /**
   * Répondre à une notification (upload documents, confirmation…)
   */
  repondre(rep: ReponseNotification): Observable<any> {
    const fd = new FormData();
    fd.append('notification_id', rep.notification_id);
    fd.append('action', rep.action);
    if (rep.message) fd.append('message', rep.message);
    rep.fichiers?.forEach((f, i) => fd.append(`fichier_${i}`, f, f.name));
  
    return this.http.post(
      `${this.apiUrl}${rep.notification_id}/repondre/`, fd, 
      { withCredentials: true }
    );
  }

  private _mapNotif(raw: any): NotificationClient {
    // Parser data si c'est une string
    let data = raw.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        data = {};
      }
    }

    return {
      id:             raw.id,
      titre:          raw.titre,
      message:        raw.message,
      type:           raw.type,
      lue:            raw.lue ?? false,
      date_creation:  raw.date_creation,
      date_lecture:   raw.date_lecture ?? null,
      depuis:         raw.depuis ?? '',
      icone:          raw.icone ?? '',
      couleur:        raw.couleur ?? '',
      lien:           raw.lien ?? null,
      personne_nom:   raw.personne_nom ?? null,
      data:           data,
      expire_le:      raw.expire_le ?? null,
      deja_repondu:   raw.deja_repondu ?? false,
      pieces_jointes: raw.pieces_jointes ?? [],
    };
  }

  // Récupérer stats (optionnel)
  getStatistiques(): Observable<NotificationStats> {
    return this.http.get<NotificationStats>(
      `${this.apiUrl}/statistiques/`, { withCredentials: true }
    );
  }

  // Métadonnées d'affichage centralisées (évite la duplication dans chaque composant)
  getMeta(type: NotificationType): { icone: string; couleur: string; bg: string } {
    const map: Record<string, { icone: string; couleur: string; bg: string }> = {
      VERIFICATION:    
      { icone: 'bi-shield-check', couleur: '#3b82f6', bg: '#eff6ff' },
      CORRECTION:      
      { icone: 'bi-exclamation-triangle', couleur: '#f59e0b', bg: '#fffbeb' },
      VALIDATION:      
      { icone: 'bi-check-circle', couleur: '#008753', bg: '#f0fdf4' },
      REJET:           
      { icone: 'bi-x-circle', couleur: '#ef4444', bg: '#fef2f2' },
      INFO:            
      { icone: 'bi-info-circle', couleur: '#6366f1', bg: '#eef2ff' },
      SYSTEM:          
      { icone: 'bi-gear', couleur: '#6b7280', bg: '#f9fafb' },
      DOCUMENT_REQUIS: 
      { icone: 'bi-file-earmark-arrow-up',  couleur: '#7c3aed', bg: '#f5f3ff' },
      ACTION_REQUISE:  
      { icone: 'bi-hand-index', couleur: '#f97316', bg: '#fff7ed' },
      RAPPEL:          
      { icone: 'bi-alarm', couleur: '#0891b2', bg: '#ecfeff' },
    };
    return map[type] ?? { icone: 'bi-bell', couleur: '#6b7280', bg: '#f9fafb' };
  }
}