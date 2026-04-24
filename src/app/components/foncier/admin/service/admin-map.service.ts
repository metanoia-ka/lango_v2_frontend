import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environnement } from '../../../../../environnements/environnement';


// ── Modèles ──────────────────────────────────────────────────────────────────

export interface ParcelleLightItem {
  id: string;
  numero: string;
  nom: string;
  statut: 'DISPONIBLE' | 'ATTRIBUEE' | 'RESERVEE' | 'REFUSEE';
  superficie: number;
  geom: GeoJSON.Geometry | null;
  lotissement_id?: string;
  lotissement_nom?: string;
}

export interface LotissementMapItem {
  id: string;
  nom: string;
  reference: string;
  localisation: string;
  geom: GeoJSON.Geometry | null;
  has_geom: boolean;
  superficie_totale: string;
  nb_parcelles: number;
  parcelles: ParcelleLightItem[];
}

export interface SridGroup {
  srid: number;
  nom_systeme: string;
  lotissements: LotissementMapItem[];
  parcelles_orphelines: ParcelleLightItem[];
}

export interface AdminMapResponse {
  total_lotissements: number;
  par_srid: Record<string, SridGroup>;
}

export interface AdminMapFilters {
  localisation?: string;
  titre_foncier?: string;
  lotissement?: string;
  srid?: string;
  statut_parcelle?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminMapService {
  private readonly base = environnement.apiBaseUrl;

  private readonly http = inject(HttpClient);

  /** Vue globale carte — admin/manager/superuser */
  getCarteGlobale(filters?: AdminMapFilters): Observable<AdminMapResponse> {
    let params = new HttpParams();
    if (filters?.localisation) params = params.set(
      'localisation', filters.localisation
    );
    if (filters?.titre_foncier) params = params.set(
      'titre_foncier', filters.titre_foncier
    );
    if (filters?.lotissement) params = params.set(
      'lotissement', filters.lotissement
    );
    if (filters?.srid) params = params.set(
      'srid', filters.srid
    );
    if (filters?.statut_parcelle) params = params.set(
      'statut_parcelle', filters.statut_parcelle
    );

    return this.http.get<AdminMapResponse>(
      `${this.base}/map/global/`, 
      { withCredentials: true, params }
    );
  }

  /** Parcelles d'un lotissement spécifique */
  getParcellesLotissement(
    lotissementId: string,
    statut?: string
  ): Observable<{ 
    lotissement: string; 
    reference: string; 
    total_parcelles: number; 
    parcelles: ParcelleLightItem[] 
  }> {
    let params = new HttpParams();
    if (statut) params = params.set('statut', statut);
    return this.http.get<any>(
      `${this.base}/lotissements/${lotissementId}/parcelles/`,
      { withCredentials: true, params }
    );
  }
}
