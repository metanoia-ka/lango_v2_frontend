import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environnement } from '../../../../environnements/environnement';
import {
   Parcelle, 
   ParcelleCreatePayload, 
   ParcelleDetail, 
   StatutParcelle 
  } from '../models/parcelle.model';

@Injectable({ providedIn: 'root' })
export class ParcelleService {
  private readonly http = inject(HttpClient);
  private apiUrl = environnement.apiBaseUrl;
    private readonly base = `${this.apiUrl}/parcelles`;

  getAll(page = 1, search = '', lotissementId?: string): Observable<Parcelle[]> {
    let params = new HttpParams().set('page', page);
    if (search)        params = params.set('search', search);
    if (lotissementId) params = params.set('lotissement', lotissementId);
    return this.http.get<Parcelle[]>(`${this.base}/`, { withCredentials: true, params });
  }

  /**
   * Récupère les parcelles DISPONIBLES rattachées à un titre foncier.
   * Utilisé dans le formulaire BienImmobilier pour le select parcelle.
   * Chaîne : TitreFoncier → Lotissements → Parcelles(statut=DISPONIBLE)
   */
  getByTitreFoncier(titreFoncierId: string): Observable<Parcelle[]> {
    const params = new HttpParams()
      .set('titre_foncier', titreFoncierId)
      .set('statut', 'DISPONIBLE');
    return this.http.get<Parcelle[]>(`${this.base}/`, { withCredentials: true, params });
  }

  getById(id: string): Observable<Parcelle> {
    return this.http.get<Parcelle>(`${this.base}/${id}/`, { withCredentials: true });
  }

  getParcelleById(id: string): Observable<ParcelleDetail> {
    return this.http.get<ParcelleDetail>(`${this.base}/${id}/`, { withCredentials: true });
  }

  create(payload: ParcelleCreatePayload): Observable<any> {
    // Endpoint dédié : ParcelleCreateView
    return this.http.post<any>(`${this.base}/create/`, payload, { withCredentials: true });
  }

  updateStatut(id: string, statut: StatutParcelle): Observable<Parcelle> {
    return this.http.patch<Parcelle>(
      `${this.base}/${id}/`, { withCredentials: true, statut }
    );
  }

  delete(id: string, motif: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/${id}/`, 
      { 
        params: { motif },
        withCredentials: true 
      }
    );
  }
}
