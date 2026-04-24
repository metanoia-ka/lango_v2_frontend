import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environnement } from '../../../../environnements/environnement';
import {
  AuteurStatut,
  MesAbonnesResponse,
  MesFollowsResponse,
  NewsletterStatut
} from '../models/newsletter.model';
import { catchError, Observable, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NewsletterService {
  private http = inject(HttpClient);
  private readonly base = `${environnement.apiBaseUrl}`;

  // ── Signaux réactifs ──────────────────────────────────────────────────────
  // Statut newsletter générale
  newsletterStatut = signal<NewsletterStatut>({ abonne: false });

  // Map auteurId → suivi (pour affichage bouton dans les listes)
  private _suiviMap = signal<Map<string, AuteurStatut>>(new Map());

  // ════════════════════════════════════════════════════════════════════════════
  // MODE 1 — Newsletter générale (accueil / liste annonces)
  // ════════════════════════════════════════════════════════════════════════════

  /** Charger le statut de souscription de l'utilisateur */
  chargerStatutNewsletter(): Observable<NewsletterStatut> {
    return this.http.get<NewsletterStatut>(
      `${this.base}/newsletter/`, { withCredentials: true }
    ).pipe(
      tap(s => this.newsletterStatut.set(s))
    );
  }

  /** Souscrire à la newsletter générale */
  souscrire(payload: {
    frequence: string;
    types_souhaites: string[];
  }): Observable<any> {
    return this.http.post(
      `${this.base}/newsletter/souscrire/`, payload, { withCredentials: true }
    ).pipe(
      tap(() => this.chargerStatutNewsletter().subscribe())
    );
  }

  /** Se désabonner */
  desabonner(): Observable<any> {
    return this.http.post(
      `${this.base}/newsletter/desabonner/`, {}, { withCredentials: true }
    ).pipe(
      tap(() => this.newsletterStatut.set({ abonne: false }))
    );
  }

  /** Modifier les préférences */
  mettreAJourPreferences(payload: {
    frequence?: string;
    types_souhaites?: string[];
  }): Observable<any> {
    return this.http.patch(
      `${this.base}/newsletter/preferences/`, payload, { withCredentials: true }
    ).pipe(
      tap(() => this.chargerStatutNewsletter().subscribe())
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MODE 2 — Suivre un auteur (détail annonce)
  // ════════════════════════════════════════════════════════════════════════════

  /** Charger le statut suivi pour un auteur */
  chargerStatutAuteur(auteurId: string): Observable<AuteurStatut> {
    return this.http.get<AuteurStatut>(
      `${this.base}/newsletter-auteur/statut/?auteur_id=${auteurId}`,
      { withCredentials: true }
    ).pipe(
      tap(s => {
        this._suiviMap.update(m => {
          const copy = new Map(m);
          copy.set(auteurId, s);
          return copy;
        });
      })
    );
  }

  /** Retourne le statut en cache (pour le template) */
  getStatutAuteur(auteurId: string): AuteurStatut | null {
    return this._suiviMap().get(auteurId) ?? null;
  }

  /** Suivre un auteur */
  suivreAuteur(auteurId: string): Observable<AuteurStatut> {
    return this.http.post<AuteurStatut>(
      `${this.base}/newsletter-auteur/suivre/`,
      { auteur_id: auteurId }, { withCredentials: true }
    ).pipe(
      tap(s => this._mettreAJourSuivi(auteurId, s)),
      catchError(err => {
        return throwError(() => err);
      })
    );
  }

  /** Ne plus suivre */
  nePlusSuivreAuteur(auteurId: string): Observable<AuteurStatut> {
    return this.http.post<AuteurStatut>(
      `${this.base}/newsletter-auteur/ne-plus-suivre/`,
      { auteur_id: auteurId }, { withCredentials: true }
    ).pipe(
      tap(s => this._mettreAJourSuivi(auteurId, s))
    );
  }

  getMesFollows(): Observable<MesFollowsResponse> {
    return this.http.get<MesFollowsResponse>(
      `${this.base}/newsletter-auteur/mes-follows/`,
      { withCredentials: true }
    );
  }

  getMesAbonnes(): Observable<MesAbonnesResponse> {
    return this.http.get<MesAbonnesResponse>(
      `${this.base}/newsletter-auteur/mes-abonnes/`,
      { withCredentials: true }
    );
  }

  private _mettreAJourSuivi(auteurId: string, statut: AuteurStatut): void {
    this._suiviMap.update(m => {
      const copy = new Map(m);
      copy.set(auteurId, statut);
      return copy;
    });
  }
}