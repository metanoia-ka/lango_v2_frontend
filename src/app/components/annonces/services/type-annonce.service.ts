import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environnement } from '../../../../environnements/environnement';
import { TypeAnnonce } from '../models/type-annonce.model';

@Injectable({
  providedIn: 'root'
})
export class TypeAnnonceService {
  private http = inject(HttpClient);
  private apiUrl = `${environnement.apiBaseUrl}/types-annonces/`;

  // Signaux réactifs
  typesAnnonces = signal<TypeAnnonce[]>([]);
  private typeAnnoncesSubject = new BehaviorSubject<TypeAnnonce[]>([]);
  public typeAnnonces$ = this.typeAnnoncesSubject.asObservable();

  /**
  * Charge les types d'annonces depuis le backend.
  * Ajoute un paramètre de requête pour contourner le cache du navigateur.
  */
  fetchTypeAnnonces(): void {
    const url = `${this.apiUrl}`;
    this.http.get<TypeAnnonce[]>(url, { withCredentials: true }).subscribe({
        next: (types) => {
          this.typeAnnoncesSubject.next(types);
        }
    });
  }

  /**
   * Liste des types d'annonces actifs
   */
  getTypesAnnonces(): Observable<TypeAnnonce[]> {
    const url = `${this.apiUrl}`;
    return this.http.get<TypeAnnonce[]>(url, { withCredentials: true }).pipe(
      tap(types => this.typesAnnonces.set(types)),
      catchError(err => {
        return throwError(() => err)
      })
    );
  }

  /**
   * Détail d'un type d'annonce (par slug)
   */
  getTypeAnnonce(slug: string): Observable<TypeAnnonce> {
    return this.http.get<TypeAnnonce>(`${this.apiUrl}${slug}/`, { withCredentials: true });
  }

  /**
   * Statistiques des annonces par type
   */
  getStatistiques(): Observable<{
    id: string;
    nom: string;
    slug: string;
    icone: string;
    couleur: string;
    nb_annonces_total: number;
    nb_annonces_actives: number;
  }[]> {
    return this.http.get<any[]>(`${this.apiUrl}statistiques/`, { withCredentials: true });
  }

  /**
   * Créer un type d'annonce (Admin)
   */
  createTypeAnnonce(data: {
    nom: string;
    slug?: string;
    description?: string;
    icone?: string;
    couleur?: string;
    ordre?: number;
  }): Observable<TypeAnnonce> {
    return this.http.post<TypeAnnonce>(this.apiUrl, data, { withCredentials: true });
  }

  /**
   * Modifier un type d'annonce (Admin)
   */
  updateTypeAnnonce(slug: string, data: Partial<TypeAnnonce>): Observable<TypeAnnonce> {
    return this.http.patch<TypeAnnonce>(
      `${this.apiUrl}${slug}/`, data, { withCredentials: true }
    );
  }

  /**
   * Supprimer un type d'annonce (Admin)
   */
  deleteTypeAnnonce(slug: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${slug}/`, { withCredentials: true });
  }
}