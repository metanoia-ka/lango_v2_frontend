import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  CoordinateSystem, 
  CoordinateSystemCreatePayload 
} from '../models/coordinate-system.model';
import { environnement } from '../../../../environnements/environnement';

@Injectable({ providedIn: 'root' })
export class CoordinateSystemService {
  private readonly http = inject(HttpClient);
  private apiUrl = environnement.apiBaseUrl;
  private readonly base = `${this.apiUrl}/coordinate-systems`;

  getAll(search = '', ordering = '-created_at'): Observable<CoordinateSystem[]> {
    let params = new HttpParams().set('ordering', ordering);
    if (search) params = params.set('search', search);
    return this.http.get<CoordinateSystem[]>(
      `${this.base}/`, { withCredentials: true, params }
    );
  }

  /** Détail avec metadata + supported_operations (CoordinateSystemDetailSerializer) */
  getById(id: string): Observable<CoordinateSystem> {
    return this.http.get<CoordinateSystem>(
      `${this.base}/${id}/`, { withCredentials: true }
    );
  }

  create(payload: CoordinateSystemCreatePayload): Observable<CoordinateSystem> {
    return this.http.post<CoordinateSystem>(
      `${this.base}/`, payload, { withCredentials: true }
    );
  }

  update(
    id: string, payload: Partial<CoordinateSystemCreatePayload>
  ): Observable<CoordinateSystem> {
    return this.http.patch<CoordinateSystem>(
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
}
