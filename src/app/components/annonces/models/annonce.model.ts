import { TypeAnnonce } from "./type-annonce.model";

// ── Chaîne foncière (nouveaux types) ─────────────────────────────────────────

export interface TitreFoncierMini {
  id: string;
  numero: string;
  superficie_totale?: number;
  est_verifie: boolean;
  date_verification?: string;
}

export interface LotissementMini {
  id: string;
  nom: string;
  reference: string;
  commune?: string;
  superficie_totale?: number;
}

export interface ParcelleMini {
  id: string;
  numero: string;
  superficie?: number;
  statut: string;
  lotissement?: LotissementMini;
  titre_foncier?: TitreFoncierMini;
}

export interface PhotoBien {
  id: string;
  url: string;
  is_principale: boolean;
  ordre?: number;
  legende?: string;
}

// ── BienResume (version enrichie) ─────────────────────────────────────────────
// Remplace l'ancien BienResume qui avait un champ 'titre' inexistant côté Django.
// Le "titre" affiché en UI sera construit depuis type_bien.nom + localisation_approx.

export interface BienResume {
  id: string;
  type_bien?: { id: string; nom: string };
  type_bien_categorie?:    string;
  type_transaction: string;                    // 'VENTE' | 'LOCATION' | 'LOCATION_VENTE'
  type_transaction_display?: string;           // 'Vente' | 'Location' ...
  localisation_approx: string;
  superficie?: number;
  prix_m2?: number;
  loyer_mensuel?: number;
  prix_principal?: number;                     // ← calculé côté Django (property)
  description?: string;
  ville_label?: string;
  zone_tarifaire?: string;
  statut_bien?: string;
  is_verified?: boolean;
  duree_bail_min_mois?: number;
  caution_mois?: number;
  parcelle?: ParcelleMini;                     // → lotissement → titre_foncier
  photos?: PhotoBien[];
}

// Helper : construire un label lisible depuis un BienResume
export function bienLabel(bien: BienResume | undefined): string {
  if (!bien) return '—';
  const type = bien.type_bien?.nom ?? '';
  return type ? `${type} – ${bien.localisation_approx}` : bien.localisation_approx;
}

// ── Statuts ────────────────────────────────────────────────────────────────────

export enum StatutAnnonce {
  DRAFT     = 'DRAFT',
  PENDING   = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED  = 'ARCHIVED',
  REJECTED  = 'REJECTED'
}

// ── AnnonceListItem ────────────────────────────────────────────────────────────

export interface AnnonceListItem {
  id: string;
  titre: string;
  image_principale?: string;
  prix?: number;                               // auto-rempli depuis bien.prix_principal
  type_annonce: TypeAnnonce;
  auteur_nom: string;
  statut: StatutAnnonce;
  date_debut: string;
  date_fin?: string;
  est_active: boolean;
  jours_restants?: number;
  vues: number;
  created_at: string;
  bien?: BienResume;                           // enrichi (parcelle, photos, etc.)
}

// ── Annonce (détail complet) ───────────────────────────────────────────────────

export interface Annonce {
  id: string;
  titre: string;
  contenu: string;
  image_principale?: string;
  prix?: number;                               // READ-ONLY — auto-rempli depuis le bien
  type_annonce: TypeAnnonce;
  type_annonce_id?: string;
  auteur: string;
  auteur_nom: string;
  auteur_info: { id: string; username: string };
  date_debut: string;
  date_fin?: string;
  statut: StatutAnnonce;
  vues: number;
  validee_par?: string;
  validee_par_nom?: string;
  validee_par_info?: { id: string; username: string };
  date_validation?: string;
  motif_rejet?: string;
  est_active: boolean;
  jours_restants?: number;
  nb_commentaires: number;
  nb_conversations: number;
  created_at: string;
  updated_at: string;
  bien?: BienResume;                           // enrichi : chaîne foncière complète
  bien_id?: string;
}

// ── CreateAnnonce — payload pour POST /annonces/from-bien/ ────────────────────
// prix RETIRÉ : auto-rempli côté Django depuis bien.prix_principal
// titre OPTIONNEL : auto-généré si absent

export interface CreateAnnonce {
  bien_id: string;
  type_annonce_id: string;
  date_debut: string;
  date_fin?: string;
  titre?: string;                              // optionnel (auto-généré si vide)
  contenu?: string;                            // optionnel (repris du bien si vide)
  image_principale?: File;
  // 'prix' intentionnellement absent — géré par le backend
}

// ── UpdateAnnonce — payload pour PATCH /annonces/{id}/ ───────────────────────
// En édition, on peut modifier titre/contenu/dates/image mais pas le prix

export interface UpdateAnnonce {
  type_annonce_id?: string;
  date_debut?: string;
  date_fin?: string;
  titre?: string;
  contenu?: string;
  image_principale?: File;
  bien_id?: string;                            // rarement utilisé (changement de bien)
}

// ── Filtres ────────────────────────────────────────────────────────────────────

export interface AnnonceFilters {
  search?:           string;
  type_annonce?:     string;
  // Discriminateur
  type_bien_annonce?:  'IMMOBILIER' | 'EVENEMENTIEL';
  statut?:           string;
  // Bien immobilier
  categorie_bien?:     string;
  type_bien?:          string;
  type_transaction?:   string;
  prix_min?:           number;
  prix_max?:           number;
  superficie_min?:     number;
  superficie_max?:     number;
  avec_titre_foncier?: boolean;
  // Espace événementiel
  type_espace?:        string[];
  capacite_min?:       number;
  equipement?:         string;
  date_dispo?:         string;  // YYYY-MM-DD
  // Géographie commune
  zone?:               string;
  ville?:              string;
  arrondissement?:     string;
  // Tri
  ordering?:           string;
  // Pagination
  page?:               number;
  page_size?:          number;
}

// Réponse paginée depuis le backend (si DRF pagination activée)
export interface AnnoncePagedResponse {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  AnnonceListItem[];
}