import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  Arrondissement,
  RegionAvecDepartements,
	TitreFoncier, 
	TitreFoncierCreatePayload, 
	VerificationPayload, 
	VerificationResponse 
} from '../models/titre-foncier.model';
import { environnement } from '../../../../environnements/environnement';

@Injectable({ providedIn: 'root' })
export class TitreFoncierService {
  private readonly http = inject(HttpClient);
	private apiUrl = environnement.apiBaseUrl;

  titres      = signal<TitreFoncier[]>([]);
  regions     = signal<RegionAvecDepartements[]>([]);

  // ── Référentiels géographiques ────────────────────────────────────────────
  getRegionsAvecDepartements(): Observable<RegionAvecDepartements[]> {
    return this.http.get<RegionAvecDepartements[]>(
      `${this.apiUrl}/regions/avec-departements/`,
      { withCredentials: true }
    ).pipe(tap(d => this.regions.set(d)));
  }

  getArrondissements(departementId: string): Observable<Arrondissement[]> {
    return this.http.get<Arrondissement[]>(
      `${this.apiUrl}/arrondissements/?departement=${departementId}`,
      { withCredentials: true }
    );
  }

  // ── Liste ──────────────────────────────────────────────────────
  getAll(page = 1, search = ''): Observable<TitreFoncier[]> {
    let params = new HttpParams().set('page', page);
    if (search) params = params.set('search', search);
    return this.http.get<TitreFoncier[]>(
			`${this.apiUrl}/titres-fonciers/`, { withCredentials: true, params }
		);
  }

  /**
   * Titres fonciers actifs du propriétaire connecté.
   * Utilisé dans le formulaire BienImmobilier.
   */
  getMesTitres(): Observable<TitreFoncier[]> {
    const params = new HttpParams().set('est_actif', 'true');
    return this.http.get<TitreFoncier[]>(
      `${this.apiUrl}/titres-fonciers/`, { withCredentials: true, params }
    ).pipe(tap(d => { this.titres.set(d); }));
  }


  // ── Détail ─────────────────────────────────────────────────────
  getById(id: string): Observable<TitreFoncier> {
    return this.http.get<TitreFoncier>(
			`${this.apiUrl}/titres-fonciers/${id}/`, { withCredentials: true }
		);
  }

  // ── Création (multipart/form-data pour le scan) ────────────────
  create(payload: TitreFoncierCreatePayload): Observable<TitreFoncier> {
    const fd = new FormData();
    fd.append('numero', payload.numero);
    fd.append('superficie_totale', String(payload.superficie_totale));
    if (payload.document_scan) {
      fd.append('document_scan', payload.document_scan, payload.document_scan.name);
    }
    return this.http.post<TitreFoncier>(
			`${this.apiUrl}/titres-fonciers/`, fd, { withCredentials: true }
		).pipe(tap(t => this.titres.update(l => [t, ...l])));
  }

  // ── Mise à jour (patch) ────────────────────────────────────────
  update(
		id: string, payload: Partial<TitreFoncierCreatePayload>
	): Observable<TitreFoncier> {
    const fd = new FormData();
    if (payload.numero)  fd.append('numero', payload.numero);
    if (payload.superficie_totale) fd.append(
			'superficie_totale', String(payload.superficie_totale)
		);
    if (payload.document_scan)     fd.append(
			'document_scan', payload.document_scan, payload.document_scan.name
		);
    return this.http.patch<TitreFoncier>(
			`${this.apiUrl}/titres-fonciers/${id}/`, fd, { withCredentials: true }
		).pipe(tap(t => this.titres.update(l => l.map(x => x.id === id ? t : x))));
  }

  // ── Suppression ────────────────────────────────────────────────
  delete(id: string, motif: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/titres-fonciers/${id}/`, 
      { 
        params: { motif },
        withCredentials: true 
      }
    ).pipe(tap(() => this.titres.update(l => l.filter(x => x.id !== id))));
  }

  creer(payload: FormData): Observable<TitreFoncier> {
    return this.http.post<TitreFoncier>(
      `${this.apiUrl}/titres-fonciers/`, payload, { withCredentials: true }
    ).pipe(tap(t => this.titres.update(l => [t, ...l])));
  }

  modifier(id: string, payload: FormData): Observable<TitreFoncier> {
    return this.http.patch<TitreFoncier>(
      `${this.apiUrl}/titres-fonciers/${id}/`, payload, { withCredentials: true }
    ).pipe(tap(t => this.titres.update(l => l.map(x => x.id === id ? t : x))));
  }

  // ── Vérification (Admin / Manager) ────────────────────────────
  verifier(id: string, payload: VerificationPayload): Observable<VerificationResponse> {
    return this.http.post<VerificationResponse>(
      `${this.apiUrl}/titres-fonciers/${id}/verification/`,
      payload,
			{ withCredentials: true }
    );
  }

  // ── Aperçu du numéro avant envoi ─────────────────────────────────────────
  previewNumero(seq: number, abrDept: string): string {
    if (!seq || !abrDept) return '';
    return `TF N°${seq}/${abrDept}`;
  }

  // ── Téléchargement du scan ─────────────────────────────────────
  downloadScan(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob' });
  }
}