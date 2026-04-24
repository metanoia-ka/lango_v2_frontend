import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable, signal } from "@angular/core";
import { environnement } from "../../../../environnements/environnement";
import { 
  DisponibiliteEspace,
  DisponibilitePayload,
  EquipementEspace,
  EquipementPayload,
  EspaceEvenementielDetail,
  EspaceEvenementielFilter, 
  EspaceEvenementielList, 
  EspaceEvenementielPayload, 
  PaginatedResponse, 
  PhotoEspace, 
  PhotoUploadPayload, 
  TarifEspace, 
  TarifPayload
} from "../models/espace-evenementiel.model";
import { Observable, tap } from "rxjs";

@Injectable({ providedIn: 'root' })
export class EspaceEvenementielService {
  
  private readonly http = inject(HttpClient);
  private readonly base = `${environnement.apiBaseUrl}/evenementiel/espaces`;
 
  /** Cache réactif des espaces de l'utilisateur connecté */
  readonly mesEspaces = signal<EspaceEvenementielDetail[]>([]);
 
  // ── Helpers privés ────────────────────────────────────────────────────────
 
  private opts() {
    return { withCredentials: true } as const;
  }
 
  /** Construit l'URL d'une sous-ressource : /espaces/{id}/{ressource} */
  private sub(espaceId: string, ressource: string): string {
    return `${this.base}/${espaceId}/${ressource}`;
  }
 
  private buildParams(filters: EspaceEvenementielFilter): HttpParams {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== '') {
        p = p.set(k, String(v));
      }
    }
    return p;
  }
 
  // ── Espace — lecture ──────────────────────────────────────────────────────
 
  getList(
    filters: EspaceEvenementielFilter = {}
  ): Observable<PaginatedResponse<EspaceEvenementielList>> {
    return this.http.get<PaginatedResponse<EspaceEvenementielList>>(
      `${this.base}/`,
      { ...this.opts(), params: this.buildParams(filters) },
    );
  }
 
  getById(id: string): Observable<EspaceEvenementielDetail> {
    return this.http.get<EspaceEvenementielDetail>(`${this.base}/${id}/`, this.opts());
  }
 
  getMesEspaces(): Observable<EspaceEvenementielDetail[]> {
    return this.http.get<EspaceEvenementielDetail[]>(
      `${this.base}/mes-espaces/`, this.opts(),
    ).pipe(tap(data => this.mesEspaces.set(data)));
  }
 
  // ── Espace — écriture ─────────────────────────────────────────────────────
 
  /** Étape 0 : crée l'espace (champs de base). Retourne l'objet avec son id. */
  create(payload: EspaceEvenementielPayload): Observable<EspaceEvenementielDetail> {
    return this.http.post<EspaceEvenementielDetail>(
      `${this.base}/`, payload, this.opts(),
    ).pipe(tap(e => this.mesEspaces.update(l => [e, ...l])));
  }
 
  /** Mise à jour partielle (PATCH) des champs de base de l'espace. */
  patch(
    id: string, payload: Partial<EspaceEvenementielPayload>
  ): Observable<EspaceEvenementielDetail> {
    return this.http.patch<EspaceEvenementielDetail>(
      `${this.base}/${id}/`, payload, this.opts(),
    ).pipe(tap(e => this.mesEspaces.update(l => l.map(x => x.id === id ? e : x))));
  }
 
  delete(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/${id}/`, this.opts(),
    ).pipe(tap(() => this.mesEspaces.update(l => l.filter(x => x.id !== id))));
  }
 
  // ── Tarifs ────────────────────────────────────────────────────────────────
 
  /**
   * Remplace TOUS les tarifs de l'espace en une requête.
   * POST /espaces/{id}/tarifs/bulk/
   */
  saveTarifs(espaceId: string, tarifs: TarifPayload[]): Observable<TarifEspace[]> {
    return this.http.post<TarifEspace[]>(
      `${this.sub(espaceId, 'tarifs')}/bulk/`, tarifs, this.opts(),
    );
  }
 
  // ── Équipements ───────────────────────────────────────────────────────────
 
  /**
   * Remplace TOUS les équipements de l'espace en une requête.
   * POST /espaces/{id}/equipements/bulk/
   */
  saveEquipements(
    espaceId: string, equips: EquipementPayload[]
  ): Observable<EquipementEspace[]> {
    return this.http.post<EquipementEspace[]>(
      `${this.sub(espaceId, 'equipements')}/bulk/`, equips, this.opts(),
    );
  }
 
  // ── Disponibilités ────────────────────────────────────────────────────────
 
  /**
   * Remplace TOUTES les disponibilités de l'espace en une requête.
   * POST /espaces/{id}/disponibilites/bulk/
   */
  saveDisponibilites(
    espaceId: string, slots: DisponibilitePayload[]
  ): Observable<DisponibiliteEspace[]> {
    return this.http.post<DisponibiliteEspace[]>(
      `${this.sub(espaceId, 'disponibilites')}/bulk/`, slots, this.opts(),
    );
  }
 
  // ── Photos ────────────────────────────────────────────────────────────────
 
  /**
   * Upload d'une photo (multipart/form-data).
   * POST /espaces/{id}/photos/
   *
   * Correspond à PhotoEspaceUploadSerializer :
   *   image   — File, requis, max 5 Mo, JPG/PNG/WEBP/GIF
   *   legende — string, optionnel, max 200 car.
   *   ordre   — number, optionnel, défaut 0
   *
   * Retourne un PhotoEspace complet (id, image URL absolue, legende,
   * est_principale, ordre, created_at).
   */
  uploadPhoto(espaceId: string, payload: PhotoUploadPayload): Observable<PhotoEspace> {
    const fd = new FormData();
    fd.append('image', payload.image);
    if (payload.legende !== undefined) {
      fd.append('legende', payload.legende);
    }
    if (payload.ordre !== undefined) {
      fd.append('ordre', String(payload.ordre));
    }
    return this.http.post<PhotoEspace>(
      `${this.sub(espaceId, 'photos')}/`, fd, this.opts(),
    );
  }
 
  /**
   * Supprime une photo.
   * DELETE /espaces/{id}/photos/{photoId}/
   */
  deletePhoto(espaceId: string, photoId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.sub(espaceId, 'photos')}/${photoId}/`, this.opts(),
    );
  }
 
  /**
   * Définit une photo comme photo principale.
   * PATCH /espaces/{id}/photos/{photoId}/principale/
   */
  setPhotoPrincipale(espaceId: string, photoId: string): Observable<PhotoEspace> {
    return this.http.patch<PhotoEspace>(
      `${this.sub(espaceId, 'photos')}/${photoId}/principale/`, {}, this.opts(),
    );
  }
 
  /**
   * Modifie l'ordre d'affichage d'une photo dans la galerie.
   * PATCH /espaces/{id}/photos/{photoId}/ordre/
   */
  setOrdrePhoto(
    espaceId: string, photoId: string, ordre: number
  ): Observable<PhotoEspace> {
    return this.http.patch<PhotoEspace>(
      `${this.sub(espaceId, 'photos')}/${photoId}/ordre/`, { ordre }, this.opts(),
    );
  }

}
