import { TypeTransaction } from "./bien-type-immobilier.model";
import { Arrondissement } from "./titre-foncier.model";

export interface CategorieBien {
  id:          string;
  nom:         string;
  slug:        string;
  description: string;
  icone:       string;    // ex: 'bi-house-fill'
  couleur:     string;    // ex: '#008753'
  ordre:       number;
  est_actif:   boolean;
  nb_types:    number;
  created_at:  string;
}

export interface TypeBienImmobilier {
  id:                 string;
  categorie:          string;   // UUID FK
  categorie_nom:      string;
  categorie_slug:     string;
  nom:                string;
  code:               string;
  description:        string;
  ordre:              number;
  est_actif:          boolean;
  meuble:             boolean;
  necessite_parcelle: boolean;
  date_creation:      string;
}

export interface CategorieBienAvecTypes {
  id:       string;
  nom:      string;
  slug:     string;
  icone:    string;
  couleur:  string;
  ordre:    number;
  est_actif: boolean;
  types:    TypeBienImmobilier[];
}

export interface TypeBienCreate {
  categorie:          string;
  nom:                string;
  description?:       string;
  icone?:             string;
  ordre?:             number;
  meuble?:            boolean;
  necessite_parcelle?: boolean;
}

export interface CategorieBienCreate {
  nom:         string;
  description?: string;
  icone?:       string;
  couleur?:     string;
  ordre?:       number;
}

// ── LOCATION_VENTE helpers ────────────────────────────────────────────────────

export const TRANSACTION_LABELS: Record<TypeTransaction, string> = {
  VENTE:          'Vente',
  LOCATION:       'Location',
  LOCATION_VENTE: 'Location-vente',
};

export const TRANSACTION_DESCRIPTIONS: Record<TypeTransaction, string> = {
  VENTE:          'Le bien est mis en vente définitive.',
  LOCATION:       'Le bien est proposé à la location.',
  LOCATION_VENTE: 'Le bien peut être loué et/ou acheté (formule mixte).',
};

export const TRANSACTION_ICONES: Record<TypeTransaction, string> = {
  VENTE:          'bi-house-door-fill',
  LOCATION:       'bi-key-fill',
  LOCATION_VENTE: 'bi-arrow-left-right',
};

// ── Modèle arrondissement pour sélecteur ─────────────────────────────────────

export interface DepartementAvecArrs {
  id:             string;
  nom:            string;
  abreviation:    string;
  arrondissements: Arrondissement[];
}

export interface RegionComplete {
  id:          string;
  nom:         string;
  code:        string;
  departements: DepartementAvecArrs[];
}