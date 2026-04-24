import { inject, Injectable, signal } from "@angular/core";
import { AnnonceListItem } from "../models/annonce-new.model";
import { HttpClient, HttpParams } from "@angular/common/http";
import { environnement } from "../../../../../environnements/environnement";
import { AnnonceFilters, InfiniteAnnonceResponse } from "../models/annonce-infinite.model";
import { Observable, tap } from "rxjs";

interface InfiniteScrollState {
  items: AnnonceListItem[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number | null;
  loading: boolean;
  initialLoadDone: boolean;
}

@Injectable({ providedIn: 'root' })
export class AnnonceInfiniteService {
  private http = inject(HttpClient);
  private baseUrl = `${environnement.apiBaseUrl}/annonces`;
  
  // État local
  private state = signal<InfiniteScrollState>({
    items: [],
    nextCursor: null,
    hasMore: true,
    totalCount: null,
    loading: false,
    initialLoadDone: false,
  });
  
  // Signaux publics en lecture seule
  readonly annonces = signal<AnnonceListItem[]>([]);
  readonly hasMore = signal(true);
  readonly isLoading = signal(false);
  readonly totalCount = signal<number | null>(null);
  readonly initialLoadDone = signal(false);
  
  // Filtres courants
  private currentFilters = signal<AnnonceFilters>({});
  
  /**
   * Charge la première page (réinitialise tout)
   */
  loadInitial(filtres: AnnonceFilters = {}): Observable<InfiniteAnnonceResponse> {
    this.isLoading.set(true);
    this.currentFilters.set(filtres);
    
    // Réinitialiser l'état
    this.annonces.set([]);
    this.state.set({
      items: [],
      nextCursor: null,
      hasMore: true,
      totalCount: null,
      loading: true,
      initialLoadDone: false,
    });
    
    return this.fetchAnnonces(filtres, null).pipe(
      tap(response => {
        this.annonces.set(response.results);
        this.hasMore.set(response.has_next);
        this.totalCount.set(response.total_count);
        this.initialLoadDone.set(true);
        
        this.state.set({
          items: response.results,
          nextCursor: response.next,
          hasMore: response.has_next,
          totalCount: response.total_count,
          loading: false,
          initialLoadDone: true,
        });
        
        this.isLoading.set(false);
      })
    );
  }
  
  /**
   * Charge la page suivante (ajoute aux résultats existants)
   */
  loadMore(): Observable<InfiniteAnnonceResponse> | null {
    const currentState = this.state();
    
    if (currentState.loading || !currentState.hasMore) {
      return null;
    }
    
    this.isLoading.set(true);
    this.state.update(s => ({ ...s, loading: true }));
    
    return this.fetchAnnonces(this.currentFilters(), currentState.nextCursor).pipe(
      tap(response => {
        const newItems = [...this.annonces(), ...response.results];
        this.annonces.set(newItems);
        this.hasMore.set(response.has_next);
        
        this.state.set({
          items: newItems,
          nextCursor: response.next,
          hasMore: response.has_next,
          totalCount: response.total_count,
          loading: false,
          initialLoadDone: true,
        });
        
        this.isLoading.set(false);
      })
    );
  }
  
  /**
   * Rafraîchit avec de nouveaux filtres
   */
  refresh(filtres: AnnonceFilters): Observable<InfiniteAnnonceResponse> {
    return this.loadInitial(filtres);
  }
  
  /**
   * Réinitialise complètement
   */
  reset(): void {
    this.annonces.set([]);
    this.hasMore.set(true);
    this.isLoading.set(false);
    this.totalCount.set(null);
    this.initialLoadDone.set(false);
    this.currentFilters.set({});
    
    this.state.set({
      items: [],
      nextCursor: null,
      hasMore: true,
      totalCount: null,
      loading: false,
      initialLoadDone: false,
    });
  }
  
  private fetchAnnonces(
    filtres: AnnonceFilters, 
    cursor: string | null
  ): Observable<InfiniteAnnonceResponse> {
    let params = new HttpParams();
    
    // Ajouter le curseur si présent
    if (cursor) {
      params = params.set('cursor', cursor);
    }
    
    // Ajouter les filtres
    Object.entries(filtres).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    
    return this.http.get<InfiniteAnnonceResponse>(`${this.baseUrl}/`, {
      params,
      withCredentials: true
    });
  }
}