import { HttpClient, HttpParams, HttpResponse } from "@angular/common/http";
import { computed, inject, Injectable, signal } from "@angular/core";
import { environnement } from "../../../../../environnements/environnement";
import { 
  Annonce, 
  AnnonceListItem, CreateAnnonce, 
  StatutAnnonce, UpdateAnnonce 
} from "../models/annonce-new.model";
import { catchError, map, Observable, tap, throwError } from "rxjs";
import { AnnonceFilters } from "../../models/annonce.model";

// ── Headers middleware ────────────────────────────────────────────────────────
const H_SOLDE       = 'x-credit-solde';
const H_VIEWS_USED  = 'x-free-views-used';
const H_VIEWS_LEFT  = 'x-free-views-remaining';
const H_VIEWS_RESET = 'x-free-views-reset';
const H_VIEWS_MAX   = 'x-free-views-max';

@Injectable({ providedIn: 'root' })
export class AnnonceService {

  private http   = inject(HttpClient);
  private apiUrl = `${environnement.apiBaseUrl}/annonces`;

  // ── Signals réactifs ──────────────────────────────────────────────────────
  annonces      = signal<AnnonceListItem[]>([]);
  annonceDetail = signal<Annonce | null>(null);
  isLoading     = signal(false);

  // Quota & solde mis à jour depuis les headers middleware
  soldeCredits    = signal<number | null>(null);
  viewsUsed       = signal<number | null>(null);
  viewsLeft       = signal<number | null>(null);
  viewsMax        = signal<number | null>(null);
  viewsResetDate  = signal<Date | null>(null);

  // Computed pour la barre de progression frontend
  quotaPercent = computed(() => {
    const used = this.viewsUsed();
    const max  = this.viewsMax();
    if (used == null || max == null || max === 0) return 0;
    return Math.round((used / max) * 100);
  });

  quotaAtteint = computed(() => {
    const left = this.viewsLeft();
    return left !== null && left <= 0;
  });

  // ── Extraction des headers middleware ─────────────────────────────────────
  private _lireHeaders(response: HttpResponse<any>): void {
    const solde = response.headers.get(H_SOLDE);
    const used  = response.headers.get(H_VIEWS_USED);
    const left  = response.headers.get(H_VIEWS_LEFT);
    const max   = response.headers.get(H_VIEWS_MAX);
    const reset = response.headers.get(H_VIEWS_RESET);

    if (solde != null)  this.soldeCredits.set(parseInt(solde, 10));
    if (used  != null)  this.viewsUsed.set(parseInt(used, 10));
    if (left  != null)  this.viewsLeft.set(parseInt(left, 10));
    if (max   != null)  this.viewsMax.set(parseInt(max, 10));
    if (reset != null)  this.viewsResetDate.set(new Date(reset));
  }

  // ── LECTURE — liste ───────────────────────────────────────────────────────
  getAnnonces(filters?: AnnonceFilters): Observable<AnnonceListItem[]> {
    this.isLoading.set(true);
    let params = new HttpParams();

    if (filters?.search)              
      params = params.set('search', filters.search);
    if (filters?.type_annonce)        
      params = params.set('type_annonce', filters.type_annonce);
    if (filters?.type_transaction)    
      params = params.set('type_transaction',   filters.type_transaction);
    if (filters?.statut)              
      params = params.set('statut', filters.statut);
    if (filters?.prix_min != null)    
      params = params.set('prix_min', filters.prix_min.toString());
    if (filters?.prix_max != null) 
      params = params.set('prix_max', filters.prix_max.toString());
    if (filters?.superficie_min != null) 
      params = params.set('superficie_min', filters.superficie_min.toString());
    if (filters?.superficie_max != null) 
      params = params.set('superficie_max', filters.superficie_max.toString());
    if (filters?.zone) 
      params = params.set('zone', filters.zone);
    if (filters?.avec_titre_foncier) 
      params = params.set('avec_titre_foncier','true');
    if (filters?.ordering) 
      params = params.set('ordering', filters.ordering);

    return this.http.get<AnnonceListItem[]>(
      `${this.apiUrl}/`, { params, withCredentials: true, observe: 'response' }
    ).pipe(
      tap(resp => {
        this._lireHeaders(resp);
        const data = Array.isArray(resp.body) 
        ? resp.body 
        : (resp.body as any)?.results ?? [];
        this.annonces.set(data);
        this.isLoading.set(false);
      }),
      map(resp => Array.isArray(resp.body) ? resp.body : (resp.body as any)?.results ?? []),
      catchError(err => { this.isLoading.set(false); return throwError(() => err); })
    );
  }

  // ── LECTURE — détail ──────────────────────────────────────────────────────
  // Retourne la réponse complète (body + headers) pour que le composant
  // puisse lire _acces et mettre à jour le quota.
  getAnnonce(id: string): Observable<Annonce> {
    return this.http.get<Annonce>(
      `${this.apiUrl}/${id}/`, { withCredentials: true, observe: 'response' }
    ).pipe(
      tap(resp => {
        this._lireHeaders(resp);
        if (resp.body) this.annonceDetail.set(resp.body);
      }),
      map(resp => resp.body!),
      catchError(err => throwError(() => err))
    );
  }

  // ── LECTURE — mes annonces (vendor) ───────────────────────────────────────
  getMesAnnonces(): Observable<AnnonceListItem[]> {
    return this.http.get<AnnonceListItem[]>(
      `${this.apiUrl}/mes-annonces/`, { withCredentials: true, observe: 'response' }
    ).pipe(
      tap(resp => {
        this._lireHeaders(resp);
        this.annonces.set(resp.body ?? []);
      }),
      map(resp => resp.body ?? []),
      catchError(err => throwError(() => err))
    );
  }

  getAnnoncesEnAttente(): Observable<AnnonceListItem[]> {
    return this.http.get<AnnonceListItem[]>(
      `${this.apiUrl}/en-attente/`, { withCredentials: true }
    );
  }

  // ── ÉCRITURE ──────────────────────────────────────────────────────────────
  private _toDatetime(date: string): string {
    if (date.includes('T') && (date.includes('+') || date.includes('Z'))) return date;
    const base = date.length === 10 ? `${date}T23:59:59` : date;
    return `${base}Z`;
  }

  createFromBien(payload: CreateAnnonce): Observable<Annonce> {
    const form = new FormData();
    form.append('bien_id',         payload.bien_id);
    form.append('type_annonce_id', payload.type_annonce_id);
    form.append('date_debut',      this._toDatetime(payload.date_debut));
    if (payload.date_fin) 
      form.append('date_fin', this._toDatetime(payload.date_fin));
    if (payload.titre?.trim()) 
      form.append('titre', payload.titre);
    if (payload.contenu?.trim()) 
      form.append('contenu', payload.contenu);
    if (payload.image_principale instanceof File) {
      form.append('image_principale', payload.image_principale);
    }
    return this.http.post<Annonce>(
      `${this.apiUrl}/from-bien/`, form, { withCredentials: true }
    );
  }

  updateAnnonce(id: string, payload: UpdateAnnonce): Observable<Annonce> {
    const form = new FormData();
    if (payload.titre) 
      form.append('titre', payload.titre);
    if (payload.contenu) 
      form.append('contenu', payload.contenu);
    if (payload.type_annonce_id) 
      form.append('type_annonce_id', payload.type_annonce_id);
    if (payload.date_debut) 
      form.append('date_debut', this._toDatetime(payload.date_debut));
    if (payload.date_fin) 
      form.append('date_fin', this._toDatetime(payload.date_fin));
    if (payload.bien_id) 
      form.append('bien_id', payload.bien_id);
    if (payload.image_principale instanceof File) {
      form.append('image_principale', payload.image_principale);
    }
    return this.http.patch<Annonce>(
      `${this.apiUrl}/${id}/`, form, { withCredentials: true }
    );
  }

  deleteAnnonce(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}/`, { withCredentials: true });
  }

  // ── ACTIONS ADMIN ─────────────────────────────────────────────────────────
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

  // ── ACTIONS VENDOR ────────────────────────────────────────────────────────
  publierVendor(id: string): Observable<Annonce> {
    return this.http.post<Annonce>(
      `${this.apiUrl}/${id}/publier-vendor/`, {}, { withCredentials: true }
    );
  }

  mettreEnAttente(id: string): Observable<Annonce> {
    return this.http.post<Annonce>(
      `${this.apiUrl}/${id}/mettre-en-attente/`, {}, { withCredentials: true }
    );
  }

  remettreEnAttente(
    id: string, motif: string
  ): Observable<{ detail: string; statut: string }> {
    return this.http.post<{ detail: string; statut: string }>(
      `${this.apiUrl}/${id}/remettre-en-attente/`,
      { motif },
      { withCredentials: true }
    ) 
  }

  archiverVendor(id: string): Observable<Annonce> {
    return this.http.post<Annonce>(
      `${this.apiUrl}/${id}/archiver-vendor/`, {}, { withCredentials: true }
    );
  }

  // ── HELPERS UI ────────────────────────────────────────────────────────────
  getStatutBadgeClass(statut: StatutAnnonce): string {
    const c: Record<StatutAnnonce, string> = {
      [StatutAnnonce.DRAFT]:     'bg-secondary',
      [StatutAnnonce.PENDING]:   'bg-warning',
      [StatutAnnonce.PUBLISHED]: 'bg-success',
      [StatutAnnonce.ARCHIVED]:  'bg-secondary',
      [StatutAnnonce.REJECTED]:  'bg-danger',
    };
    return c[statut] ?? 'bg-secondary';
  }

  getStatutLabel(statut: StatutAnnonce): string {
    const l: Record<StatutAnnonce, string> = {
      [StatutAnnonce.DRAFT]:     'Brouillon',
      [StatutAnnonce.PENDING]:   'En attente',
      [StatutAnnonce.PUBLISHED]: 'Publié',
      [StatutAnnonce.ARCHIVED]:  'Archivé',
      [StatutAnnonce.REJECTED]:  'Rejeté',
    };
    return l[statut] ?? statut;
  }
}
