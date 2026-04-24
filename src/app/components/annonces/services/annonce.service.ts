import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import {
  Annonce,
  AnnonceFilters,
  AnnonceListItem,
  CreateAnnonce,
  UpdateAnnonce,
  StatutAnnonce
} from '../models/annonce.model';
import { environnement } from '../../../../environnements/environnement';

@Injectable({ providedIn: 'root' })
export class AnnonceService {

  private http   = inject(HttpClient);
  private apiUrl = `${environnement.apiBaseUrl}/annonces`;

  annonces      = signal<AnnonceListItem[]>([]);
  annonceDetail = signal<Annonce | null>(null);
  isLoading     = signal(false);

  // ── Lecture ──────────────────────────────────────────────────────────────────

  getAnnonces(filters?: AnnonceFilters): Observable<AnnonceListItem[]> {
    this.isLoading.set(true);
    let params = new HttpParams();

    if (filters?.search) {
      params = params.set('search', filters.search);
    }
    if (filters?.type_annonce) { 
      params = params.set('type_annonce', filters.type_annonce); 
    }
    if (filters?.type_transaction) { 
      params = params.set('type_transaction', filters.type_transaction); 
    }
    if (filters?.statut) { 
      params = params.set('statut', filters.statut); 
    }
    if (filters?.prix_min != null) { 
      params = params.set('prix_min', filters.prix_min.toString()); 
    }
    if (filters?.prix_max != null) { 
      params = params.set('prix_max', filters.prix_max.toString()); 
    }
    if (filters?.superficie_min != null) { 
      params = params.set('superficie_min', filters.superficie_min.toString()); 
    }
    if (filters?.superficie_max != null) { 
      params = params.set('superficie_max', filters.superficie_max.toString());
    }
    if (filters?.zone) { 
      params = params.set('zone', filters.zone);
    }
    if (filters?.avec_titre_foncier) { 
      params = params.set('avec_titre_foncier', 'true');
    }
    if (filters?.ordering) { 
      params = params.set('ordering', filters.ordering);
    }

    return this.http.get<AnnonceListItem[]>(
      this.apiUrl + '/', { params, withCredentials: true }
    ).pipe(
      tap(data => { this.annonces.set(data); this.isLoading.set(false); }),
      catchError(err => { this.isLoading.set(false); return throwError(() => err); })
    );
  }

  getAnnonce(id: string): Observable<Annonce> {
    return this.http.get<Annonce>(
      `${this.apiUrl}/${id}/`, { withCredentials: true }
    ).pipe(
      tap(a => this.annonceDetail.set(a)),
      catchError(err => throwError(() => err))
    );
  }

  getMesAnnonces(): Observable<AnnonceListItem[]> {
    return this.http.get<AnnonceListItem[]>(
      `${this.apiUrl}/mes-annonces/`, { withCredentials: true }
    ).pipe(
      tap(data => this.annonces.set(data)),
      catchError(err => throwError(() => err))
    );
  }

  getAnnoncesEnAttente(): Observable<AnnonceListItem[]> {
    return this.http.get<AnnonceListItem[]>(
      `${this.apiUrl}/en-attente/`, { withCredentials: true }
    );
  }

  // ── Écriture ─────────────────────────────────────────────────────────────────

  private _toDatetime(date: string): string {
    if (date.includes('T') && (date.includes('+') || date.includes('Z'))) return date;
    const base = date.length === 10 ? `${date}T23:59:59` : date;
    return `${base}Z`;
  }

  /**
   * POST /annonces/from-bien/
   *
   * Crée une annonce depuis un bien existant.
   * Le prix est auto-rempli côté Django depuis bien.prix_principal.
   * Le titre est auto-généré si non fourni.
   *
   * Utiliser cet endpoint pour toute CRÉATION (remplace l'ancien createAnnonce).
   */
  createFromBien(payload: CreateAnnonce): Observable<Annonce> {
    const formData = new FormData();
    formData.append('bien_id',         payload.bien_id);
    formData.append('type_annonce_id', payload.type_annonce_id);
    formData.append('date_debut',      this._toDatetime(payload.date_debut));

    if (payload.date_fin) formData.append('date_fin', this._toDatetime(payload.date_fin));
    if (payload.titre?.trim())     formData.append('titre',      payload.titre);
    if (payload.contenu?.trim())   formData.append('contenu',    payload.contenu);
    if (payload.image_principale instanceof File) {
      formData.append('image_principale', payload.image_principale);
    }

    // NB : 'prix' intentionnellement absent — backend l'injecte depuis le bien
    return this.http.post<Annonce>(
      `${this.apiUrl}/from-bien/`, formData, { withCredentials: true }
    );
  }

  /**
   * PATCH /annonces/{id}/
   *
   * Modification d'une annonce existante.
   * Prix non modifiable (toujours calqué sur le bien).
   */
  updateAnnonce(id: string, payload: UpdateAnnonce): Observable<Annonce> {
    const formData = new FormData();
    if (payload.titre) 
      formData.append('titre', payload.titre);
    if (payload.contenu) 
      formData.append('contenu', payload.contenu);
    if (payload.type_annonce_id) 
      formData.append('type_annonce_id', payload.type_annonce_id);
    if (payload.date_debut) 
      formData.append('date_debut', this._toDatetime(payload.date_debut));
    if (payload.date_fin) 
      formData.append('date_fin', this._toDatetime(payload.date_fin));
    if (payload.bien_id) 
      formData.append('bien_id', payload.bien_id);
    if (payload.image_principale instanceof File) {
      formData.append('image_principale', payload.image_principale);
    }
    // prix intentionnellement absent

    return this.http.patch<Annonce>(
      `${this.apiUrl}/${id}/`, formData, { withCredentials: true }
    );
  }

  deleteAnnonce(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/`, { withCredentials: true });
  }

  // ── Actions admin ─────────────────────────────────────────────────────────────
  publierAnnonce(id: string): Observable<{ message: string; annonce: Annonce }> {
    return this.http.post<{ message: string; annonce: Annonce }>(
      `${this.apiUrl}/${id}/publier/`, {}, { withCredentials: true }
    );
  }

  rejeterAnnonce(
    id: string, motif: string
  ): Observable<{ message: string; annonce: Annonce }> {
    return this.http.post<{ message: string; annonce: Annonce }>(
      `${this.apiUrl}/${id}/rejeter/`, { motif }, { withCredentials: true }
    );
  }

  archiverAnnonce(id: string): Observable<{ message: string; annonce: Annonce }> {
    return this.http.post<{ message: string; annonce: Annonce }>(
      `${this.apiUrl}/${id}/archiver/`, {}, { withCredentials: true }
    );
  }

  // ── Actions Vendor ─────────────────────────────────────────────────────────────
  // POST /annonces/{id}/publier-vendor/
  publierVendor(id: string): Observable<Annonce> {
    return this.http.post<Annonce>(
      `${this.apiUrl}/${id}/publier-vendor/`, {},
      { withCredentials: true }
    );
  }

  // POST /annonces/{id}/mettre-en-attente/
  mettreEnAttente(id: string): Observable<Annonce> {
    return this.http.post<Annonce>(
      `${this.apiUrl}/${id}/mettre-en-attente/`, {},
      { withCredentials: true }
    );
  }

  // POST /annonces/{id}/archiver-vendor/
  archiverVendor(id: string): Observable<Annonce> {
    return this.http.post<Annonce>(
      `${this.apiUrl}/${id}/archiver-vendor/`, {},
      { withCredentials: true }
    );
  }

  // ── Helpers UI ────────────────────────────────────────────────────────────────

  getStatutBadgeClass(statut: StatutAnnonce): string {
    const classes: Record<StatutAnnonce, string> = {
      [StatutAnnonce.DRAFT]:     'bg-secondary',
      [StatutAnnonce.PENDING]:   'bg-warning',
      [StatutAnnonce.PUBLISHED]: 'bg-success',
      [StatutAnnonce.ARCHIVED]:  'bg-secondary',
      [StatutAnnonce.REJECTED]:  'bg-danger',
    };
    return classes[statut] ?? 'bg-secondary';
  }

  getStatutLabel(statut: StatutAnnonce): string {
    const labels: Record<StatutAnnonce, string> = {
      [StatutAnnonce.DRAFT]:     'Brouillon',
      [StatutAnnonce.PENDING]:   'En attente',
      [StatutAnnonce.PUBLISHED]: 'Publié',
      [StatutAnnonce.ARCHIVED]:  'Archivé',
      [StatutAnnonce.REJECTED]:  'Rejeté',
    };
    return labels[statut] ?? statut;
  }
}