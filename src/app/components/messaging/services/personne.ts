import { inject, Injectable, PLATFORM_ID, signal } from "@angular/core";
import { PresenceUpdate, PresenceUser, WsPresenceEvent } from "../models/messaging.models";
import { environnement } from "../../../../environnements/environnement";
import { isPlatformBrowser } from "@angular/common";
import { ToastService } from "../../../services/toast.service";

@Injectable({ providedIn: 'root' })
export class PresenceService {

  private platformId = inject(PLATFORM_ID);

  private toast = inject(ToastService);

  // ── État réactif ──────────────────────────────────────────────────────────
  /** Map user_id → PresenceUser pour accès O(1) */
  private _usersEnLigne = signal<Map<string, PresenceUser>>(new Map());

  /** Signal public — liste des users en ligne */
  usersEnLigne = this._usersEnLigne.asReadonly();

  wsConnecte = signal(false);

  // ── WebSocket ─────────────────────────────────────────────────────────────
  private ws: WebSocket | null = null;
  private reconnectAttempts    = 0;
  private maxReconnectAttempts = 5;
  private heartbeatInterval:   ReturnType<typeof setInterval> | null = null;

  private readonly WS_URL = `${environnement.wsBaseUrl}/presence/`;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.connect();
    }
  }

  // ── Connexion WebSocket ───────────────────────────────────────────────────
  connect(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.ws?.readyState === WebSocket.OPEN ||
        this.ws?.readyState === WebSocket.CONNECTING) return;

    this.ws = new WebSocket(this.WS_URL);

    this.ws.onopen = () => {
      this.wsConnecte.set(true);
      this.reconnectAttempts = 0;
      this._startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const data: WsPresenceEvent = JSON.parse(event.data);
        this._handleMessage(data);
      } catch (e) {
        this.toast.showError(`PresenceService: erreur parsing WS. SHOW_ERROR: ${e}`)
        //console.error('PresenceService: erreur parsing WS', e);
      }
    };

    this.ws.onerror = () => {
      this.wsConnecte.set(false);
    };

    this.ws.onclose = (event) => {
      this.wsConnecte.set(false);
      this.ws = null;
      this._stopHeartbeat();

      // Reconnexion exponentielle
      if (event.code !== 1000 && event.code !== 4003 &&
          this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        setTimeout(() => this.connect(), delay);
      }
    };
  }

  disconnect(): void {
    this._stopHeartbeat();
    this.ws?.close(1000);
    this.ws = null;
    this.wsConnecte.set(false);
  }

  // ── Handlers messages WS ─────────────────────────────────────────────────
  private _handleMessage(data: WsPresenceEvent): void {

    if (data.type === 'presence_init') {
      // Réception de la liste complète à la connexion
      const map = new Map<string, PresenceUser>();
      data.users.forEach(u => map.set(u.user_id, u));
      this._usersEnLigne.set(map);
      return;
    }

    if (data.type === 'presence_update') {
      const update = data as PresenceUpdate;
      this._usersEnLigne.update(map => {
        const next = new Map(map);
        if (update.status === 'online') {
          next.set(update.user_id, {
            user_id:      update.user_id,
            user_nom:     update.user_nom,
            user_email:   update.user_email,
            user_role:    update.user_role,
            en_ligne:     true,
            derniere_vue: update.timestamp,
          });
        } else {
          // Marquer hors ligne (on garde dans la map pour afficher "dernière vue")
          const existing = next.get(update.user_id);
          if (existing) {
            next.set(update.user_id, {
              ...existing,
              en_ligne:     false,
              derniere_vue: update.timestamp,
            });
          } else {
            next.delete(update.user_id);
          }
        }
        return next;
      });
    }
  }

  // ── API publique ──────────────────────────────────────────────────────────

  /**
   * Retourne true si un user donné est en ligne.
   * Utilisé par le dashboard admin pour afficher l'indicateur.
   */
  estEnLigne(userId: string): boolean {
    return this._usersEnLigne().get(userId)?.en_ligne ?? false;
  }

  /**
   * Liste triée : en ligne d'abord, puis par dernière vue.
   */
  get listeTriee(): PresenceUser[] {
    return Array.from(this._usersEnLigne().values()).sort((a, b) => {
      if (a.en_ligne !== b.en_ligne) return a.en_ligne ? -1 : 1;
      return new Date(b.derniere_vue).getTime() - new Date(a.derniere_vue).getTime();
    });
  }

  /** Demande la liste complète au serveur. */
  requestList(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'get_online_users' }));
    }
  }

  // ── Heartbeat ─────────────────────────────────────────────────────────────
  private _startHeartbeat(): void {
    this._stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'ping' }));
      }
    }, 30_000);
  }

  private _stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

}