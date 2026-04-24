import { inject, Injectable, signal } from "@angular/core";
import { environnement } from "../../../../../environnements/environnement";
import { HttpClient } from "@angular/common/http";
import { Observable, tap } from "rxjs";
import { 
  AgentStats, 
  ApprouverRequest, 
  AssignationTicket, 
  SignalerRequest, 
  VerdictResponse 
} from "../models/agent.model";

@Injectable({ providedIn: 'root' })
export class AgentService {
  private http   = inject(HttpClient);
  private base   = `${environnement.apiBaseUrl}/agent/mes-assignations`;

  tickets = signal<AssignationTicket[]>([]);
  stats = signal<AgentStats | null>(null);
  loading = signal(false);

  /**
   * GET /agent/mes-assignations/
   * Récupère les tickets EN_ATTENTE et EN_COURS
   */
  getMesTickets(): Observable<AssignationTicket[]> {
    this.loading.set(true);
    return this.http.get<AssignationTicket[]>(
      `${this.base}/`, 
      { withCredentials: true }
    ).pipe(
      tap(tickets => {
        this.tickets.set(tickets);
        this.loading.set(false);
      })
    );
  }

  /**
   * GET /agent/mes-assignations/stats/
   * Récupère les statistiques du jour
   */
  getStats(): Observable<AgentStats> {
    return this.http.get<AgentStats>(
      `${this.base}/stats/`, 
      { withCredentials: true }
    ).pipe(
      tap(stats => this.stats.set(stats))
    );
  }

  /**
   * POST /agent/mes-assignations/{id}/prendre-en-charge/
   * Passe un ticket EN_ATTENTE → EN_COURS
   */
  prendreEnCharge(ticketId: string): Observable<VerdictResponse> {
    return this.http.post<VerdictResponse>(
      `${this.base}/${ticketId}/prendre-en-charge/`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(() => this._mettreAJourTicketLocal(ticketId, 'EN_COURS'))
    );
  }

  /**
   * POST /agent/mes-assignations/{id}/approuver/
   * Approuve l'annonce → PUBLISHED
   */
  approuver(ticketId: string, localisationVerifiee?: string): Observable<VerdictResponse> {
    const payload: ApprouverRequest = {};
    if (localisationVerifiee?.trim()) {
      payload.localisation_verifiee = localisationVerifiee.trim();
    }
    
    return this.http.post<VerdictResponse>(
      `${this.base}/${ticketId}/approuver/`,
      payload,
      { withCredentials: true }
    ).pipe(
      tap(() => this._retirerTicket(ticketId))
    );
  }

  /**
   * POST /agent/mes-assignations/{id}/signaler/
   * Signale une non-conformité → REJECTED
   */
  signaler(
    ticketId: string, motif: string, localisationVerifiee?: string
  ): Observable<VerdictResponse> {
    const payload: SignalerRequest = { motif: motif.trim() };
    if (localisationVerifiee?.trim()) {
      payload.localisation_verifiee = localisationVerifiee.trim();
    }
    
    return this.http.post<VerdictResponse>(
      `${this.base}/${ticketId}/signaler/`,
      payload,
      { withCredentials: true }
    ).pipe(
      tap(() => this._retirerTicket(ticketId))
    );
  }

  private _mettreAJourTicketLocal(id: string, nouveauStatut: 'EN_COURS'): void {
    this.tickets.update(list => 
      list.map(t => t.id === id ? { ...t, statut: nouveauStatut } : t)
    );
  }

  private _retirerTicket(id: string): void {
    this.tickets.update(list => list.filter(t => t.id !== id));
  }
}