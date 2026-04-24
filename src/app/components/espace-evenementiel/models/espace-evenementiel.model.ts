// ── Énumérations ──────────────────────────────────────────────────────────────

export type TypeEspace =
  | 'SALLE_FETES'
  | 'SALLE_CONFERENCE'
  | 'SALLE_MARIAGE'
  | 'SALLE_REUNION'
  | 'PLEIN_AIR'
  | 'RESTAURANT'
  | 'STUDIO'
  | 'TERRAIN_SPORT'
  | 'AUTRE';

export type UniteLocation =
  | 'HEURE'
  | 'DEMI_J'
  | 'JOURNEE'
  | 'WEEKEND'
  | 'SEMAINE'
  | 'MOIS';

export type StatutEspace = 'DISPONIBLE' | 'RESERVE' | 'INDISPONIBLE';

export type MotifIndisponibilite = 'RESERVE' | 'BLOQUE' | 'ENTRETIEN';

// ── Sous-modèles ──────────────────────────────────────────────────────────────

export interface TarifEspace {
  id: string;
  unite: UniteLocation;
  unite_label: string;
  prix: number;
  duree_min: number;
  est_actif?: boolean;
}

export interface EquipementEspace {
  id: string;
  nom: string;
  inclus: boolean;
  prix_option: number | null;
  icone: string;
}

/**
 * Modèle complet de PhotoEspace — reflète exactement le modèle Django.
 * Champs retournés par PhotoEspaceSerializer (lecture) :
 *   id, image (URL absolue), legende, est_principale, ordre, created_at
 */
export interface PhotoEspace {
  id: string;
  /** URL absolue construite côté Django via request.build_absolute_uri() */
  image: string;
  legende: string;
  est_principale: boolean;
  /** Position dans la galerie (0 = premier). Modifiable via PATCH …/ordre/ */
  ordre: number;
  created_at: string;
}

export interface DisponibiliteEspace {
  id: string;
  date_debut: string;   // ISO 8601
  date_fin: string;     // ISO 8601
  motif: MotifIndisponibilite;
  motif_label: string;
}

export interface ArrondissementMini {
  id: number;
  nom: string;
  ville_reference: string;
}

export interface ProprietaireMini {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
}

// ── Vues ─────────────────────────────────────────────────────────────────────

/** Vue allégée pour les cartes de liste */
export interface EspaceEvenementielList {
  id: string;
  nom: string;
  type_espace: TypeEspace;
  type_espace_label: string;
  localisation_approx: string;
  arrondissement_nom: string | null;
  ville_label: string;
  capacite_min: number;
  capacite_max: number;
  superficie_m2: number | null;
  prix_principal: number | null;
  tarifs: TarifEspace[];
  equipements_inclus: { nom: string; icone: string }[];
  statut: StatutEspace;
  is_verified: boolean;
  photo_principale: string | null;
}

/** Vue détail complète */
export interface EspaceEvenementielDetail {
  id: string;
  nom: string;
  type_espace: TypeEspace;
  type_espace_label: string;
  localisation_approx: string;
  adresse_complete: string;
  arrondissement: ArrondissementMini | null;
  ville_label: string;
  capacite_min: number;
  capacite_max: number;
  superficie_m2: number | null;
  prix_principal: number | null;
  tarifs: TarifEspace[];
  description: string;
  statut: StatutEspace;
  statut_label: string;
  is_verified: boolean;
  proprietaire: ProprietaireMini;
  equipements: EquipementEspace[];
  equipements_inclus_count: number;
  equipements_option_count: number;
  indisponibilites: DisponibiliteEspace[];
  /** Photos triées par ordre, created_at côté Django */
  photos: PhotoEspace[];
  created_at: string;
  updated_at: string;
}

// ── Payloads d'écriture ───────────────────────────────────────────────────────

/** Payload POST /espaces/ ou PATCH /espaces/{id}/ */
export interface EspaceEvenementielPayload {
  nom: string;
  type_espace: TypeEspace;
  arrondissement?: number | null;
  localisation_approx: string;
  adresse_complete?: string;
  capacite_min?: number;
  capacite_max: number;
  superficie_m2?: number | null;
  description: string;
  statut?: StatutEspace;
}

/** Payload POST /espaces/{id}/tarifs/bulk/ */
export interface TarifPayload {
  unite: UniteLocation;
  prix: number;
  duree_min: number;
  est_actif?: boolean;
}

/** Payload POST /espaces/{id}/equipements/bulk/ */
export interface EquipementPayload {
  nom: string;
  inclus: boolean;
  prix_option: number | null;
  icone: string;
}

/** Payload POST /espaces/{id}/disponibilites/bulk/ */
export interface DisponibilitePayload {
  date_debut: string;   // ISO 8601
  date_fin: string;     // ISO 8601
  motif: MotifIndisponibilite;
}

/**
 * Payload multipart/form-data pour POST /espaces/{id}/photos/
 * Construit via FormData dans le service — pas envoyé en JSON.
 * Correspond exactement à PhotoEspaceUploadSerializer :
 *   image   : File  (requis, max 2 Mo, JPG/PNG/WEBP/GIF)
 *   legende : string (optionnel, max 200 car.)
 *   ordre   : number (optionnel, défaut 0)
 */
export interface PhotoUploadPayload {
  image: File;
  legende?: string;
  ordre?: number;
}

// ── Filtres & pagination ──────────────────────────────────────────────────────

export interface EspaceEvenementielFilter {
  type_espace?: TypeEspace;
  statut?: StatutEspace;
  capacite_max__gte?: number;
  arrondissement?: number;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
