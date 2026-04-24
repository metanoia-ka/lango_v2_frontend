// ── TypeBienImmobilier ───────────────────────────────────────────────
export interface TypeBienImmobilier {
  id:            string;
  nom:           string;
  description:   string;
  est_actif:     boolean;
  date_creation: string;
}

export interface TypeBienCreatePayload {
  nom:          string;
  description?: string;
  est_actif?:   boolean;
}

// ── BienImmobilier ───────────────────────────────────────────────────
export type TypeTransaction      = 'VENTE' | 'LOCATION' | 'LOCATION_VENTE';
export type BienImmobilierStatut =
  | 'DISPONIBLE' | 'EN_NEGOCIATION' | 'RESERVEE' | 'FINALISEE' | 'A_CORRIGER';

export const TRANSACTION_LABELS: Record<TypeTransaction, string> = {
  VENTE:    'Vente',
  LOCATION: 'Location',
  LOCATION_VENTE: 'Location vente',
};

export const BIEN_STATUT_LABELS: Record<BienImmobilierStatut, string> = {
  DISPONIBLE:     'Disponible',
  EN_NEGOCIATION: 'En négociation',
  RESERVEE:       'Réservée',
  FINALISEE:      'Finalisée',
  A_CORRIGER:     'Annulée',
};

export const BIEN_STATUT_BADGE: Record<BienImmobilierStatut, string> = {
  DISPONIBLE:     'bi-badge--success',
  EN_NEGOCIATION: 'bi-badge--warning',
  RESERVEE:       'bi-badge--info',
  FINALISEE:      'bi-badge--primary',
  A_CORRIGER:     'bi-badge--danger',
};

export interface BienImmobilierPhoto {
  id:             string;
  image:          string;
  legende:        string;
  est_principale: boolean;
  ordre:          number;
  uploaded_at:    string;
}

export interface BienImmobilier {
  id:                   string;
  type_bien:            string;
  type_bien_nom?:       string;
  type_bien_categorie?: string;
  type_transaction:     TypeTransaction;
  proprietaire:         number;
  proprietaire_nom?:    string | null;
  parcelle:             string | null;
  localisation_approx:  string;

  // ── Nouveaux champs localisation ────────────────────────────────────────
  arrondissement?:      string | null;      // UUID FK
  arrondissement_nom?:  string | null;      // "Yaoundé 3ème"
  departement_nom?:     string | null;      // "Mfoundi"
  ville_label?:         string;             // "Yaoundé" normalisé

  superficie:           string | null;
  prix_m2:              string | null;
  loyer_mensuel:        string | null;
  prix_principal?:      string | null;
  description:          string;
  zone_tarifaire:       string | null;
  statut_bien:          BienImmobilierStatut;
  duree_bail_min_mois:  number | null;
  caution_mois:         number | null;
  is_verified:          boolean;
  photos?:              BienImmobilierPhoto[];
  created_at:           string;
  updated_at:           string;
}

export interface BienCreatePayload {
  type_bien:            string;
  type_transaction:     TypeTransaction;
  localisation_approx:  string;
  superficie?:          number;
  arrondissement?:      string;
  prix_m2?:             number;
  loyer_mensuel?:       number;
  description:          string;
  zone_tarifaire?:      string;
  duree_bail_min_mois?: number;
  caution_mois?:        number;
  parcelle?:            string;
  nouvelles_photos?:    File[];
}
