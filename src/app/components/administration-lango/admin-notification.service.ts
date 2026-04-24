import { computed, inject, Injectable, signal } from "@angular/core";
import { environnement } from "../../../environnements/environnement";
import { HttpClient } from "@angular/common/http";
import { 
  NotifClient, 
  DocumentRequis, 
  EnvoyerNotifPayload,
  NotificationStats, 
  NotificationType, 
  ReponseNotification
} from "./admin-notification.model";
import { Observable, Subject, tap } from "rxjs";
import { User } from "../../models/user.model";

@Injectable({ providedIn: 'root' })
export class AdministrationNotificationService {
  private http = inject(HttpClient);
  private readonly api = `${environnement.apiBaseUrl}/notification`;
  private readonly usersApi = `${environnement.apiBaseUrl}/users`;

  // ── État global réactif ──────────────────────────────────────
  notifications = signal<NotifClient[]>([]);
  nonLues = computed(() => this.notifications().filter(n => !n.lue).length);
  wsConnecte = signal(false);

  // Observable pour toaster / son / autres effets
  private _nouvelleNotif$ = new Subject<NotifClient>();
  nouvelleNotif$ = this._nouvelleNotif$.asObservable();

  
  // ── REST : consultation ──────────────────────────────────────
  charger(): Observable<NotifClient[]> {
    return this.http.get<NotifClient[]>(
      `${this.api}/`, { withCredentials: true }
    ).pipe(
      tap(data => {
        this.notifications.set(data);
      })
    );
  }

  getNonLues(): Observable<NotifClient[]> {
    return this.http.get<NotifClient[]>(
      `${this.api}/non_lues/`, { withCredentials: true }
    );
  }

  getStatistiques(): Observable<NotificationStats> {
    return this.http.get<NotificationStats>(
      `${this.api}/statistiques/`, { withCredentials: true }
    );
  }

  // ── REST : actions utilisateur ───────────────────────────────
  marquerLue(id: string): Observable<any> {
    return this.http.post(`${this.api}/${id}/marquer_lue/`, { withCredentials: true }).pipe(
      tap(() => this._patchLocal(id, { lue: true }))
    );
  }

  marquerToutesLues(): Observable<any> {
    return this.http.post(
      `${this.api}/marquer_toutes_lues/`, { withCredentials: true }
    ).pipe(
      tap(() => this.notifications.update(list => list.map(n => ({ ...n, lue: true }))))
    );
  }

  supprimer(id: string): Observable<any> {
    return this.http.delete(
      `${this.api}/${id}/supprimer/`, { withCredentials: true }
    ).pipe(
      tap(() => this.notifications.update(list => list.filter(n => n.id !== id)))
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
      `${this.api}/${rep.notification_id}/repondre/`, fd, { withCredentials: true }
    );
  }

  // ── REST : envoi admin ───────────────────────────────────────

  /** Envoyer à un seul utilisateur */
  envoyerAUser(payload: EnvoyerNotifPayload & { user_id: string }): Observable<any> {
    return this.http.post(
      `${this.api}/envoyer/`, payload, { withCredentials: true }
    );
  }

  envoyerFormData(fd: FormData, endpoint: string): Observable<any> {
    return this.http.post<any>(
      `${this.api}/${endpoint}/`,
      fd,
      {
        withCredentials: true,
        headers: { 'X-CSRFToken': this._csrf() }
      }
    );
  }

  private _csrf(): string {
    const name = 'csrftoken';
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [key, value] = cookie.trim().split('=');
      if (key === name) return decodeURIComponent(value);
    }
    return '';
  }

  /** Envoyer à plusieurs utilisateurs */
  envoyerMultiple(
    payload: EnvoyerNotifPayload & { user_ids: string[] }
  ): Observable<any> {
    return this.http.post(
      `${this.api}/envoyer_multiple/`, payload, { withCredentials: true }
    );
  }

  /** Envoyer à un rôle entier */
  envoyerParRole(payload: EnvoyerNotifPayload & { role: string }): Observable<any> {
    return this.http.post(
      `${this.api}/par_role/`, payload, { withCredentials: true }
    );
  }

  /** Broadcast tous les utilisateurs actifs */
  broadcast(payload: EnvoyerNotifPayload): Observable<any> {
    return this.http.post(
      `${this.api}/broadcast/`, payload, { withCredentials: true }
    );
  }

  /**
   * Raccourci : demande de documents
   * Construit automatiquement un payload DOCUMENT_REQUIS
   */
  demanderDocuments(
    userId: string,
    titre: string,
    message: string,
    documents: DocumentRequis[],
    extra?: Partial<EnvoyerNotifPayload>
  ): Observable<any> {
    return this.envoyerAUser({
      user_id: userId,
      titre,
      message,
      type: 'DOCUMENT_REQUIS',
      data: {
        type_action: 'fournir_documents',
        label_bouton: 'Fournir les documents',
        documents_requis: documents
      },
      ...extra
    });
  }

  /** Charger la liste des utilisateurs (pour le panneau admin) */
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.usersApi}/`, { withCredentials: true });
  }

  // ── Helpers internes ─────────────────────────────────────────
  private _patchLocal(id: string, patch: Partial<NotifClient>): void {
    this.notifications.update(list =>
      list.map(n => n.id === id ? { ...n, ...patch } : n)
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