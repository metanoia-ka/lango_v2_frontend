import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { environnement } from "../../../../environnements/environnement";
import { Observable } from "rxjs";
import { LieuDit, Quartier, TarifResponse } from "../models/zone-tarifaire.model";

@Injectable({ providedIn: 'root' })
export class ZoneGeoService {
  private http = inject(HttpClient);
  private base = `${environnement.apiBaseUrl}/geo`;

  getQuartiers(arrondissementId: string): Observable<Quartier[]> {
    const params = new HttpParams().set('arrondissement_id', arrondissementId);
    return this.http.get<Quartier[]>(
      `${this.base}/quartiers/`, { params, withCredentials: true }
    );
  }

  getLieuxDits(quartierId: string): Observable<LieuDit[]> {
    const params = new HttpParams().set('quartier_id', quartierId);
    return this.http.get<LieuDit[]>(
      `${this.base}/lieux-dits/`, { params, withCredentials: true }
    );
  }

  getTarif(
    lieuDitId: string, typeImmeuble: 'NON_BATI' | 'BATI'
  ): Observable<TarifResponse> {
    const params = new HttpParams()
      .set('lieu_dit_id',   lieuDitId)
      .set('type_immeuble', typeImmeuble);
    return this.http.get<TarifResponse>(
      `${this.base}/tarif/`, { params, withCredentials: true }
    );
  }
}