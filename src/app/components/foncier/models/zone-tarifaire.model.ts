export type TypeImmeuble = 'NON_BATI' | 'BATI';

export interface Quartier {
  id:   string;
  nom:  string;
  slug: string;
}

export interface LieuDit {
  id:                string;
  nom:               string;
  slug:              string;
  a_tarif_bati:      boolean;
  a_tarif_non_bati:  boolean;
}

export interface TarifResponse {
  tarif_disponible: boolean;
  // Si disponible :
  lieu_dit?:        string;
  quartier?:        string;
  arrondissement?:  string;
  type_immeuble?:   string;
  zone?:            string;
  categorie?:       string;
  classification?:  string;   // "Zone 1 — Catégorie A"
  valeur_m2?:       number;
  date_effet?:      string;
  source?:          string;
  // Si non disponible :
  detail?:          string;
}