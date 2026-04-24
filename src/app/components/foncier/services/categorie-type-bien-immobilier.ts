import { inject, Injectable, signal } from "@angular/core";
import { environnement } from "../../../../environnements/environnement";
import { HttpClient } from "@angular/common/http";
import { 
  CategorieBien, 
  CategorieBienAvecTypes, 
  CategorieBienCreate, 
  TypeBienCreate, 
  TypeBienImmobilier 
} from "../models/categorie-type-bien-immobilier.model";
import { Observable, tap } from "rxjs";

@Injectable({ providedIn: 'root' })
export class TypeBienService {
  private http    = inject(HttpClient);
  private apiUrl  = `${environnement.apiBaseUrl}`;

  categories       = signal<CategorieBien[]>([]);
  types            = signal<TypeBienImmobilier[]>([]);
  categoriesAvecTypes = signal<CategorieBienAvecTypes[]>([]);

  // ── Catégories ────────────────────────────────────────────────────────────

  getCategories(): Observable<CategorieBien[]> {
    return this.http.get<CategorieBien[]>(
      `${this.apiUrl}/categories/`, { withCredentials: true }
    ).pipe(tap(d => this.categories.set(d)));
  }

  getCategoriesAvecTypes(): Observable<CategorieBienAvecTypes[]> {
    return this.http.get<CategorieBienAvecTypes[]>(
      `${this.apiUrl}/categories/avec-types/`, { withCredentials: true }
    ).pipe(tap(d => this.categoriesAvecTypes.set(d)));
  }

  createCategorie(payload: CategorieBienCreate): Observable<CategorieBien> {
    return this.http.post<CategorieBien>(
      `${this.apiUrl}/categories/`, payload, { withCredentials: true }
    ).pipe(tap(c => this.categories.update(l => [...l, c])));
  }

  updateCategorie(
    id: string, payload: Partial<CategorieBienCreate>
  ): Observable<CategorieBien> {
    return this.http.patch<CategorieBien>(
      `${this.apiUrl}/categories/${id}/`, payload, { withCredentials: true }
    ).pipe(tap(c => this.categories.update(l => l.map(x => x.id === id ? c : x))));
  }

  deleteCategorie(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/categories/${id}/`, { withCredentials: true }
    ).pipe(tap(() => this.categories.update(l => l.filter(x => x.id !== id))));
  }

  // ── Types ─────────────────────────────────────────────────────────────────

  getTypes(categorieId?: string): Observable<TypeBienImmobilier[]> {
    const params = categorieId ? `?categorie=${categorieId}` : '';
    return this.http.get<TypeBienImmobilier[]>(
      `${this.apiUrl}/types-biens-immobiliers/${params}`, { withCredentials: true }
    ).pipe(tap(d => this.types.set(d)));
  }

  createType(payload: TypeBienCreate): Observable<TypeBienImmobilier> {
    return this.http.post<TypeBienImmobilier>(
      `${this.apiUrl}/types-biens-immobiliers/`, payload, { withCredentials: true }
    ).pipe(tap(t => this.types.update(l => [...l, t])));
  }

  updateType(
    id: string, payload: Partial<TypeBienCreate>
  ): Observable<TypeBienImmobilier> {
    return this.http.patch<TypeBienImmobilier>(
      `${this.apiUrl}/types-biens-immobiliers/${id}/`, payload, { withCredentials: true }
    ).pipe(tap(t => this.types.update(l => l.map(x => x.id === id ? t : x))));
  }

  deleteType(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/types-biens-immobiliers/${id}/`, { withCredentials: true }
    ).pipe(tap(() => this.types.update(l => l.filter(x => x.id !== id))));
  }

  toggleType(id: string): Observable<{ detail: string; est_actif: boolean }> {
    return this.http.post<{ detail: string; est_actif: boolean }>(
      `${this.apiUrl}/types-biens-immobiliers/${id}/toggle/`, {}, { withCredentials: true }
    ).pipe(tap(res => this.types.update(l =>
      l.map(x => x.id === id ? { ...x, est_actif: res.est_actif } : x)
    )));
  }
}