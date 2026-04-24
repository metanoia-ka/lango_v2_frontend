import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  BienCreatePayload, 
  BienImmobilier, 
  BienImmobilierPhoto 
} from '../models/bien-type-immobilier.model';
import { environnement } from '../../../../environnements/environnement';
import { BienResume } from '../../annonces/models/annonce.model';

@Injectable({ providedIn: 'root' })
export class BienImmobilierService {
  private readonly http = inject(HttpClient);
  private apiUrl = environnement.apiBaseUrl;
  private readonly base = `${this.apiUrl}/biens-immobiliers`;

  getAll(page = 1, search = ''): Observable<BienImmobilier[]> {
    let params = new HttpParams().set('page', page);
    if (search) params = params.set('search', search);
    return this.http.get<BienImmobilier[]>(
      `${this.base}/`, { withCredentials: true, params }
    );
  }

  getById(id: string): Observable<BienImmobilier> {
    return this.http.get<BienImmobilier>(
      `${this.base}/${id}/`, { withCredentials: true }
    );
  }

  getMesBiensSansAnnonce(): Observable<BienResume[]> {
  return this.http.get<BienResume[]>(
    `${this.base}/sans-annonce/`, { withCredentials: true }
  );
}

  create(payload: BienCreatePayload): Observable<BienImmobilier> {
    const fd = this.buildFormData(payload);
    return this.http.post<BienImmobilier>(
      `${this.base}/`, fd, { withCredentials: true }
    );
  }

  update(id: string, payload: Partial<BienCreatePayload>): Observable<BienImmobilier> {
    const fd = this.buildFormData(payload);
    return this.http.patch<BienImmobilier>(
      `${this.base}/${id}/`, fd, { withCredentials: true }
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/`, { withCredentials: true });
  }

  ajouterPhotos(
    id: string, photos: File[]
  ): Observable<{ photos_ajoutees: BienImmobilierPhoto[] }> {
    const fd = new FormData();
    photos.forEach(f => fd.append('images', f));
    return this.http.post<{ photos_ajoutees: BienImmobilierPhoto[] }>(
      `${this.base}/${id}/ajouter_photos/`, fd, { withCredentials: true }
    );
  }

  supprimerPhoto(bienId: string, photoId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/${bienId}/photos/${photoId}/`, { withCredentials: true }
    );
  }

  private buildFormData(payload: Partial<BienCreatePayload>): FormData {
    const fd = new FormData();
    const { nouvelles_photos, ...rest } = payload;
    Object.entries(rest).forEach(([k, v]) => {
      if (v !== undefined && v !== null) fd.append(k, String(v));
    });
    nouvelles_photos?.forEach(f => fd.append('nouvelles_photos', f));
    return fd;
  }
}
