export type StatusDocument = 'ACTIF' | 'PARTIAL_SOLD' | 'FULL_SOLD';

export const STATUS_LABELS: Record<StatusDocument, string> = {
  ACTIF:        'Actif',
  PARTIAL_SOLD: 'Partiellement vendu',
  FULL_SOLD:    'Totalement vendu',
};

export const STATUS_BADGE: Record<StatusDocument, string> = {
  ACTIF:        'tf-badge--success',
  PARTIAL_SOLD: 'tf-badge--warning',
  FULL_SOLD:    'tf-badge--danger',
};

export interface Region {
  id:    string;
  nom:   string;
  code:  string;
  ordre: number;
  est_actif: boolean;
}

export interface Departement {
  id:          string;
  nom:         string;
  abreviation: string;   // 'Mf', 'Maf', 'Wou'…
  region:      string;   // UUID
  region_nom:  string;
  region_code: string;
  est_actif:   boolean;
  arrondissements: Arrondissement[];
}

export interface Arrondissement {
  id:          string;
  nom:         string;
  departement: string;   // UUID
  est_actif:   boolean;
  ville_reference?: string;
}

export interface RegionAvecDepartements extends Region {
  departements: Departement[];
}

export interface TitreFoncier {
  id:                    string;
  // Numérotation
  numero:                string;   // legacy ou généré
  numero_sequence:       number | null;
  reference_officielle:  string;   // "TF N°1234/Maf"
  // Géographie
  region:                string | null;
  region_nom:            string | null;
  region_code:           string | null;
  departement:           string | null;
  departement_nom:       string | null;
  departement_abr:       string | null;
  arrondissement:        string | null;
  arrondissement_nom:    string | null;
  localisation_complete: string;   // "Centre — Mfoundi — Yaoundé 1er"
  // Propriétaire
  proprietaire:          string;
  proprietaire_nom:      string;
  // Documents
  document_scan:         string | null;
  document_scan_url:     string | null;
  // Superficie
  superficie_totale:     number;
  superficie_restante:   number;
  // Statut
  statut:                StatusDocument;
  est_actif:             boolean;
  est_verifie:           boolean;
  date_verification:     string | null;
  commentaire_verification: string;
  created_at:            string;
  updated_at:            string;
}

export interface TitreFoncierCreatePayload {
  numero:           string;
  superficie_totale: number;
  document_scan?:   File | null;

  region_id?:         string;
  departement_id?:    string;
  arrondissement_id?: string;
  numero_sequence?:   number;
}

export interface VerificationPayload {
  valide:       boolean;
  commentaire?: string;
  action_type?: 'rejeter' | 'a_corriger';
}

export interface VerificationResponse {
  success:           boolean;
  message:           string;
  notification_sent: boolean;
  titre:             TitreFoncier;
}