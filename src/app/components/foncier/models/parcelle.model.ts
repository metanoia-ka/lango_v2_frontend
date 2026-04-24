import { GeoJSONPolygon } from "./partage-foncier.model";

// ── Borne ────────────────────────────────────────────────────────────
export interface Borne {
  id:           string;
  identifiant:  string;
  ordre:        number;
  point_native: { x: number; y: number };
  systeme_srid: number;
}

// ── Parcelle ─────────────────────────────────────────────────────────
export type StatutParcelle = 'DISPONIBLE' | 'ATTRIBUEE' | 'RESERVEE' | 'REFUSEE';

export const STATUT_PARCELLE_LABELS: Record<StatutParcelle, string> = {
  DISPONIBLE: 'Disponible',
  ATTRIBUEE:  'Attribuée',
  RESERVEE:   'Réservée',
  REFUSEE:    'Refusée',
};

export const STATUT_PARCELLE_BADGE: Record<StatutParcelle, string> = {
  DISPONIBLE: 'pf-badge--success',
  ATTRIBUEE:  'pf-badge--primary',
  RESERVEE:   'pf-badge--warning',
  REFUSEE:    'pf-badge--danger',
};

export interface Parcelle {
  id:              string;
  lotissement:     string;
  lotissement_nom?: string;
  numero:          string;
  nom:             string;
  superficie:      number;
  statut:          StatutParcelle;
  forme:           GeoJSONPolygon | null;
  bornes?:         Borne[];
  acquereur?:      string | null;
  created_at:      string;
  bornes_count?:    number;
}

export interface ParcelleCreatePayload {
  lotissement_id: string;
  statut?:        StatutParcelle;
  bornes_data:    Array<{ point: [number, number] }>;
}

export interface ParcelleDetail {
  id:               string;
  numero:           string;
  nom:              string;
  statut:           StatutParcelle;
  superficie:       number;
  lotissement:      string;           // UUID FK
  lotissement_nom?:  string;
  bornes:           BorneDetail[];
  forme:            GeoJSONPolygon | null;
  acquereur?:       PersonneResume | null;
  created_at:       string;
}

export interface BorneDetail {
  id:           string;
  identifiant?: string;
  x?:           number;
  y?:           number;
  ordre:        number;
  point_native?: { x: number; y: number };
  point_geom?:  { type: 'Point'; coordinates: [number, number] };
}

// ── Personne acquéreur (résumé) ────────────────────────────
export interface PersonneResume {
  id:   string;
  nom:  string;
  prenom?: string;
}

// ── Parcelle liste (ParcelleLightSerializer) ───────────────
export interface ParcelleLightItem {
  id:              string;
  nom:             string;
  numero:          string;
  statut:          StatutParcelle;
  superficie:      number;
  lotissement_nom: string;
  forme:           GeoJSONPolygon | null;
  bornes_count:    number;
  created_at:      string;
}