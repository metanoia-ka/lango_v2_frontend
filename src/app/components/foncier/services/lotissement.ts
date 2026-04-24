import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environnement } from '../../../../environnements/environnement';
import { Lotissement, LotissementCreatePayload } from '../models/lotissement.model';

@Injectable({ providedIn: 'root' })
export class LotissementService {
  private readonly http = inject(HttpClient);
  private apiUrl = environnement.apiBaseUrl;
  private readonly base = `${this.apiUrl}/lotissements`;

  getAll(page = 1, search = ''): Observable<Lotissement[]> {
    let params = new HttpParams().set('page', page);
    if (search) params = params.set('search', search);
    return this.http.get<Lotissement[]>(
      `${this.base}/`, { withCredentials: true, params }
    );
  }

  getById(id: string): Observable<Lotissement> {
    return this.http.get<Lotissement>(`${this.base}/${id}/`, { withCredentials: true });
  }

  create(payload: LotissementCreatePayload): Observable<Lotissement> {
    return this.http.post<Lotissement>(
      `${this.base}/`, payload, { withCredentials: true }
    );
  }

  update(id: string, payload: Partial<LotissementCreatePayload>): Observable<Lotissement> {
    return this.http.patch<Lotissement>(
      `${this.base}/${id}/`, payload, { withCredentials: true }
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

  /** Ajouter des bornes à un lotissement existant */
  addBornes(id: string, bornes: Array<{ point: [number, number] }>): Observable<any> {
    return this.http.post<any>(
      `${this.base}/${id}/bornes/`, { withCredentials: true, bornes }
    );
  }
}
