import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environnement } from '../../../../environnements/environnement';
import { 
  TypeBienCreatePayload, 
  TypeBienImmobilier 
} from '../models/bien-type-immobilier.model';

@Injectable({ providedIn: 'root' })
export class TypeBienService {
  private readonly http = inject(HttpClient);
  private apiUrl = environnement.apiBaseUrl;
  private readonly base = `${this.apiUrl}/types-biens-immobiliers`;

  getAll(search = ''): Observable<TypeBienImmobilier[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    return this.http.get<TypeBienImmobilier[]>(
      `${this.base}/`, { withCredentials: true, params }
    );
  }

  getById(id: string): Observable<TypeBienImmobilier> {
    return this.http.get<TypeBienImmobilier>(
      `${this.base}/${id}/`, { withCredentials: true }
    );
  }

  create(payload: TypeBienCreatePayload): Observable<TypeBienImmobilier> {
    return this.http.post<TypeBienImmobilier>(
      `${this.base}/`, payload, { withCredentials: true }
    );
  }

  update(
    id: string, payload: Partial<TypeBienCreatePayload>
  ): Observable<TypeBienImmobilier> {
    return this.http.patch<TypeBienImmobilier>(
      `${this.base}/${id}/`, payload, { withCredentials: true }
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/`, { withCredentials: true });
  }
}
