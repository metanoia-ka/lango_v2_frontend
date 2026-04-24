import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environnement } from '../../../../environnements/environnement';
import { Avis, AvisStatistiques, CreateAvis, ReponseAvis } from '../models/avis.model';

@Injectable({
  providedIn: 'root'
})
export class AvisService {
  private http = inject(HttpClient);
  private apiUrl = `${environnement.apiBaseUrl}/annonces`;

  // Signaux réactifs
  avisList = signal<Avis[]>([]);
  statistiques = signal<AvisStatistiques | null>(null);

  /**
   * Liste des avis d'une annonce
   */
  getAvis(annonceId: string): Observable<Avis[]> {
    return this.http.get<Avis[]>(
      `${this.apiUrl}/${annonceId}/avis/`, { withCredentials: true }
    ).pipe(
      tap(avis => this.avisList.set(avis)),
      catchError(err => {
        return throwError(() => err)
      })
    );
  }

  /**
   * Statistiques des avis d'une annonce
   */
  getStatistiques(annonceId: string): Observable<AvisStatistiques> {
    return this.http.get<AvisStatistiques>(
      `${this.apiUrl}/${annonceId}/avis/statistiques/`, { withCredentials: true }
    ).pipe(
      tap(stats => this.statistiques.set(stats)),
      catchError(err => {
        return throwError(() => err)
      })
    );
  }

  /**
   * Créer un avis (Purchaser uniquement)
   */
  createAvis(annonceId: string, avis: CreateAvis): Observable<Avis> {
    return this.http.post<Avis>(
      `${this.apiUrl}/${annonceId}/avis/`, avis, { withCredentials: true }
    );
  }

  /**
   * Modifier son avis
   */
  updateAvis(
    annonceId: string, avisId: string, avis: Partial<CreateAvis>
  ): Observable<Avis> {
    return this.http.patch<Avis>(
      `${this.apiUrl}/${annonceId}/avis/${avisId}/`, avis, { withCredentials: true }
    );
  }

  /**
   * Supprimer son avis
   */
  deleteAvis(annonceId: string, avisId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${annonceId}/avis/${avisId}/`, { withCredentials: true }
    );
  }

  /**
   * Répondre à un avis (Vendor uniquement)
   */
  repondreAvis(annonceId: string, avisId: string, contenu: string): Observable<{
    message: string;
    reponse: ReponseAvis;
  }> {
    return this.http.post<{message: string; reponse: ReponseAvis}>(
      `${this.apiUrl}/${annonceId}/avis/${avisId}/repondre/`,
      { contenu }, { withCredentials: true }
    );
  }

  /**
   * Générer les étoiles pour l'affichage
   */
  getStars(note: number): { full: number; half: boolean; empty: number } {
    const full = Math.floor(note);
    const half = note % 1 >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    return { full, half, empty };
  }

  /**
   * Obtenir la couleur selon la note
   */
  getStarColor(note: number): string {
    if (note >= 4) return 'text-success';
    if (note >= 3) return 'text-warning';
    return 'text-danger';
  }
}