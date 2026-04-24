import { inject, Injectable } from "@angular/core";
import { EnvoyerReponsePayload, NotificationReponse } from "./notification-reponse.model";
import { environnement } from "../../../../environnements/environnement";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

@Injectable({ providedIn: 'root' })
export class NotificationReponseService {

  private http = inject(HttpClient);
  private api  = `${environnement.apiBaseUrl}/notification`;

  // ── Utilisateur : répondre à une notification ──────────────────
  repondre(payload: EnvoyerReponsePayload): Observable<{
    success:        boolean;
    reponse_id:     string;
    action:         string;
    fichiers_sauves: number;
    avertissements?: { fichier: string; erreur: string }[];
  }> {
    const fd = new FormData();
    fd.append('action', payload.action);
    if (payload.message) fd.append('message', payload.message);
    payload.fichiers?.forEach((f, i) => fd.append(`fichier_${i}`, f, f.name));

    return this.http.post<any>(
      `${this.api}/${payload.notification_id}/repondre/`,
      fd,
      {
        withCredentials: true,
        headers: { 'X-CSRFToken': this._csrf() }
      }
    );
  }

  // ── Admin : lister les réponses d'une notification ─────────────
  listerReponses(notificationId: string): Observable<NotificationReponse[]> {
    return this.http.get<NotificationReponse[]>(
      `${this.api}/${notificationId}/all-reponses/`,
      { withCredentials: true }
    );
  }

  // ── Admin : marquer une réponse comme traitée ──────────────────
  traiterReponse(reponseId: string): Observable<{
    success:    boolean;
    traitee_le: string;
  }> {
    return this.http.post<any>(
      `${this.api}/reponses/${reponseId}/traiter/`,
      {},
      {
        withCredentials: true,
        headers: { 'X-CSRFToken': this._csrf() }
      }
    );
  }

  // ── Lecture cookie CSRF ────────────────────────────────────────
  private _csrf(): string {
    const match = document.cookie
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('csrftoken='));
    return match ? decodeURIComponent(match.split('=')[1]) : '';
  }
}