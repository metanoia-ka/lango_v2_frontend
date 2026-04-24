import { inject, Injectable, signal } from "@angular/core";
import { 
  VerificationAction, 
  VerificationPersonne,
  VerificationStats 
} from "../models/personne-verification";
import { catchError, map, Observable, of, tap } from "rxjs";
import { HttpClient, HttpParams } from "@angular/common/http";
import { environnement } from "../../../../../environnements/environnement";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";

@Injectable({ providedIn: 'root' })
export class SVerification {

  private endpoint = `${environnement.apiBaseUrl}/verifications/`;
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);
  personnes  = signal<VerificationPersonne[]>([]);
  stats      = signal<VerificationStats | null>(null);
  isLoading  = signal(false);

  loadProtectedFileAsBlob(url: string): Observable<SafeResourceUrl | null> {
    return this.http.get(url, { responseType: 'blob', observe: 'response' }).pipe(
      map(response => {
        const blob = response.body;
        if (!blob || blob.size === 0) {
          console.warn('Blob vide pour preuve légale');
          return null;
        }
        const objectUrl = URL.createObjectURL(blob);
        return this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl);
      }),
      catchError(err => {
        console.error('Erreur chargement preuve protégée:', err);
        if (err.status === 403 || err.status === 401) {
          console.warn('Accès refusé → utilisateur non authentifié ou pas Admin ?');
        }
        return of(null);
      })
    );
  }

  getVerifications(filters?: Partial<{
    statut: string;
    type_personne: string;
    search: string;
    avec_preuve: boolean | string;
  }>): Observable<VerificationPersonne[]> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== null && val !== undefined && val !== '') {
          params = params.set(key, String(val));
        }
      });
    }
    this.isLoading.set(true);
    return this.http.get<VerificationPersonne[]>(
      this.endpoint, { params, withCredentials: true }
    ).pipe(
      tap(data => {
        this.personnes.set(data);
        this.isLoading.set(false);
      }),
      catchError(err => {
        this.isLoading.set(false);
        throw err;
      })
    );
  }

  /**
   * POST /verifications/{id}/validate/
   * Valide la vérification. Commentaire optionnel.
   */
  valider(
    id: string,
    commentaire?: string
  ): Observable<VerificationPersonne> {
    return this.http.post<VerificationPersonne>(
      `${this.endpoint}${id}/validate/`,
      { commentaire: commentaire ?? '' },
      { withCredentials: true }
    );
  }

  /**
   * POST /verifications/{id}/reject/
   * Rejette la vérification. Commentaire OBLIGATOIRE côté backend.
   */
  rejeter(
    id: string,
    commentaire: string
  ): Observable<VerificationPersonne> {
    return this.http.post<VerificationPersonne>(
      `${this.endpoint}${id}/reject/`,
      { commentaire },
      { withCredentials: true }
    );
  }

  /**
   * POST /verifications/{id}/mettre-en-cours/
   * Prise en charge de la vérification par le verifier connecté.
   */
  mettreEnCours(id: string): Observable<VerificationPersonne> {
    return this.http.post<VerificationPersonne>(
      `${this.endpoint}${id}/mettre-en-cours/`,
      {},
      { withCredentials: true }
    );
  }

  /**
   * POST /verifications/{id}/ask-correction/
   * Demande une correction à l'utilisateur. Commentaire OBLIGATOIRE.
   */
  demanderCorrection(
    id: string,
    commentaire: string
  ): Observable<VerificationPersonne> {
    return this.http.post<VerificationPersonne>(
      `${this.endpoint}${id}/ask-correction/`,
      { commentaire },
      { withCredentials: true }
    );
  }

  /**
   * Télécharge la preuve légale d'une personne en déclenchant un download.
   */
  downloadPreuve(personneId: string): Observable<Blob> {
    return this.http.get(
      `${environnement.apiBaseUrl}/personne/${personneId}/preuve-legale/`,
      { responseType: 'blob', withCredentials: true }
    );
  }

  getVerification(id: string): Observable<VerificationPersonne> {
    return this.http.get<VerificationPersonne>(
      `${this.endpoint}${id}/`, { withCredentials: true }
    );
  }

  getStatistiques(): Observable<VerificationStats> {
    return this.http.get<VerificationStats>(
      `${this.endpoint}statistiques/`, { withCredentials: true }
    ).pipe(tap(s => this.stats.set(s)));
  }

  performAction(id: string, data: VerificationAction): Observable<any> {
    return this.http.post<any>(`${this.endpoint}${id}/verifier/`, data).pipe(
      tap(res => console.log('Action vérification effectuée:', res))
    )
  }
}