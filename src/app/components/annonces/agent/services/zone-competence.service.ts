import { inject, Injectable, signal } from "@angular/core";
import { 
  AgentResume,
  ArrondissementResume,
  BulkCreatePayload,
  BulkCreateResponse,
  CreateZoneCompetencePayload,
  UpdateZoneCompetencePayload,
  ZoneCompetenceAgent,
  ZoneCompetenceAgentList, 
  ZoneCompetenceStats 
} from "../models/zone-competence.model";
import { HttpClient, HttpParams } from "@angular/common/http";
import { environnement } from "../../../../../environnements/environnement";
import { Observable, tap } from "rxjs";

@Injectable({ providedIn: 'root' })
export class ZoneCompetenceService {
  private http = inject(HttpClient);
  private baseUrl = `${environnement.apiBaseUrl}/agent/zones-competence`;
  
  // Signaux pour l'état local
  zones = signal<ZoneCompetenceAgentList[]>([]);
  loading = signal(false);
  stats = signal<ZoneCompetenceStats | null>(null);
  
  /**
   * Récupère la liste paginée des zones de compétence
   */
  getZones(params?: {
    actif?: boolean;
    priorite?: 1 | 2;
    agent_id?: string;
    arrondissement_id?: string;
    search?: string;
    ordering?: string;
  }): Observable<ZoneCompetenceAgentList[]> {
    this.loading.set(true);
    
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          httpParams = httpParams.set(key, String(value));
        }
      });
    }
    
    return this.http.get<ZoneCompetenceAgentList[]>(`${this.baseUrl}/`, {
      params: httpParams,
      withCredentials: true
    }).pipe(
      tap(zones => {
        this.zones.set(zones);
        this.loading.set(false);
      })
    );
  }
  
  /**
   * Récupère une zone de compétence par son ID
   */
  getZone(id: string): Observable<ZoneCompetenceAgent> {
    return this.http.get<ZoneCompetenceAgent>(`${this.baseUrl}/${id}/`, {
      withCredentials: true
    });
  }
  
  /**
   * Crée une nouvelle zone de compétence
   */
  createZone(payload: CreateZoneCompetencePayload): Observable<ZoneCompetenceAgent> {
    return this.http.post<ZoneCompetenceAgent>(`${this.baseUrl}/`, payload, {
      withCredentials: true
    }).pipe(
      tap(() => this.refreshStats())
    );
  }
  
  /**
   * Met à jour une zone de compétence
   */
  updateZone(
    id: string, payload: UpdateZoneCompetencePayload
  ): Observable<ZoneCompetenceAgent> {
    return this.http.patch<ZoneCompetenceAgent>(`${this.baseUrl}/${id}/`, payload, {
      withCredentials: true
    }).pipe(
      tap(() => this.refreshStats())
    );
  }
  
  /**
   * Supprime une zone de compétence
   */
  deleteZone(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/`, {
      withCredentials: true
    }).pipe(
      tap(() => this.refreshStats())
    );
  }
  
  /**
   * Active/désactive une zone de compétence
   */
  toggleActif(id: string, actif: boolean): Observable<ZoneCompetenceAgent> {
    return this.http.patch<ZoneCompetenceAgent>(`${this.baseUrl}/${id}/`, 
      { actif }, 
      { withCredentials: true }
    );
  }
  
  /**
   * Récupère la liste des agents disponibles
   */
  getAgentsDisponibles(): Observable<AgentResume[]> {
    return this.http.get<AgentResume[]>(`${this.baseUrl}/agents/`, {
      withCredentials: true
    });
  }
  
  /**
   * Récupère la liste des arrondissements avec stats
   */
  getArrondissementsDisponibles(agentId?: string): Observable<ArrondissementResume[]> {
    let params = new HttpParams();
    if (agentId) {
      params = params.set('agent_id', agentId);
    }
    
    return this.http.get<ArrondissementResume[]>(
      `${this.baseUrl}/arrondissements-disponibles/`,
      { params, withCredentials: true },
    );
  }
  
  /**
   * Récupère les statistiques
   */
  getStats(): Observable<ZoneCompetenceStats> {
    return this.http.get<ZoneCompetenceStats>(`${this.baseUrl}/stats/`, {
      withCredentials: true
    }).pipe(
      tap(stats => this.stats.set(stats))
    );
  }
  
  /**
   * Création en masse de zones pour un agent
   */
  bulkCreate(payload: BulkCreatePayload): Observable<BulkCreateResponse> {
    return this.http.post<BulkCreateResponse>(`${this.baseUrl}/bulk-create/`, payload, {
      withCredentials: true
    }).pipe(
      tap(() => this.refreshStats())
    );
  }
  
  /**
   * Rafraîchit les statistiques
   */
  private refreshStats(): void {
    this.getStats().subscribe();
  }
}