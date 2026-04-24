import { inject, Injectable, signal } from "@angular/core";
import { environnement } from "../../../../environnements/environnement";
import { HttpClient, HttpParams } from "@angular/common/http";
import { 
  Message, 
  MessageCreatePayload, 
  MessageStats, 
  MessageStatut 
} from "../models/messaging.models";
import { catchError, Observable, of, tap } from "rxjs";

@Injectable({ providedIn: 'root' })
export class MessagingService {

  private http   = inject(HttpClient);
  private apiUrl = `${environnement.apiBaseUrl}/messaging/messages/`;

  // ── État réactif ──────────────────────────────────────────────────────────
  messages      = signal<Message[]>([]);
  stats         = signal<MessageStats | null>(null);
  loading       = signal(false);
  error         = signal<string | null>(null);
  mesMessages   = signal<Message[]>([]);

  // ── CSRF ──────────────────────────────────────────────────────────────────
  private _csrf(): string {
    const match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  private get _headers() {
    return { 'X-CSRFToken': this._csrf() };
  }

  // ── Admin — liste complète ─────────────────────────────────────────────────
  getAll(statut?: MessageStatut, search?: string): Observable<Message[]> {
    this.loading.set(true);
    this.error.set(null);

    let params = new HttpParams();
    if (statut) params = params.set('statut', statut);
    if (search) params = params.set('search', search);

    return this.http.get<Message[]>(this.apiUrl, {
      params,
      withCredentials: true
    }).pipe(
      tap(data => {
        this.messages.set(data);
        this.loading.set(false);
      }),
      catchError(err => {
        this.error.set(err.error?.detail ?? 'Erreur chargement messages.');
        this.loading.set(false);
        return of([]);
      })
    );
  }

  getById(id: string): Observable<Message> {
    return this.http.get<Message>(`${this.apiUrl}${id}/`, {
      withCredentials: true
    });
  }

  getStats(): Observable<MessageStats> {
    return this.http.get<MessageStats>(`${this.apiUrl}stats/`, {
      withCredentials: true
    }).pipe(
      tap(data => this.stats.set(data))
    );
  }

  // ── Envoi d'un message (visitor ou user connecté) ─────────────────────────
  envoyer(payload: MessageCreatePayload): Observable<Message> {
    const form = new FormData();
    form.append('sender_email', payload.sender_email);
    form.append('sender_nom',   payload.sender_nom);
    form.append('objet',        payload.objet);
    form.append('contenu',      payload.contenu);
    if (payload.piece_jointe) {
      form.append('piece_jointe', payload.piece_jointe, payload.piece_jointe.name);
    }
    return this.http.post<Message>(this.apiUrl, form, {
      withCredentials: true,
      headers: { 'X-CSRFToken': this._csrf() }
    });
  }

  // ── Admin — répondre à un message ─────────────────────────────────────────
  repondre(messageId: string, contenu: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}${messageId}/response/`,
      { contenu },
      { withCredentials: true, headers: this._headers }
    ).pipe(
      tap(() => {
        // Mettre à jour le statut localement
        this.messages.update(msgs =>
          msgs.map(m => m.id === messageId
            ? { ...m, statut: 'REPONDU' as MessageStatut }
            : m
          )
        );
      })
    );
  }

  // ── Admin — marquer lu ────────────────────────────────────────────────────
  marquerLu(messageId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}${messageId}/mark_as_read/`,
      {},
      { withCredentials: true, headers: this._headers }
    ).pipe(
      tap(() => {
        this.messages.update(msgs =>
          msgs.map(m => m.id === messageId
            ? { ...m, statut: 'LU' as MessageStatut }
            : m
          )
        );
      })
    );
  }

  // ── Admin — archiver ──────────────────────────────────────────────────────
  archiver(messageId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}${messageId}/archiver/`,
      {},
      { withCredentials: true, headers: this._headers }
    ).pipe(
      tap(() => {
        this.messages.update(msgs =>
          msgs.filter(m => m.id !== messageId)
        );
      })
    );
  }

  // ── User connecté — sa boîte ──────────────────────────────────────────────
  getMesMessages(): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}my_messages/`, {
      withCredentials: true
    }).pipe(
      tap(data => this.mesMessages.set(data))
    );
  }

}