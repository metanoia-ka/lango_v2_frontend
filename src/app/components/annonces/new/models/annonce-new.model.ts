export enum StatutAnnonce {
  DRAFT     = 'DRAFT',
  PENDING   = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED  = 'ARCHIVED',
  REJECTED  = 'REJECTED',
}

// ── Niveaux d'accès renvoyés par le backend dans _acces.niveau ───────────────
export type NiveauAcces =
  | 'visiteur'      // non connecté
  | 'gratuit'       // connecté sans crédit, quota journalier
  | 'standard'      // payant standard (grace period ou débit)
  | 'premium'       // payant avec abonnement actif
  | 'complet'       // admin / propriétaire
  | 'proprietaire'  // propriétaire de l'annonce
  | 'admin'         // admin / manager
  | null;

// ── Bloc _acces retourné par le backend avec chaque réponse retrieve ──────────
export interface AccesMeta {
  niveau:           NiveauAcces;
  peut_contacter:   boolean;
  nb_restants?:     number;   // vues restantes dans le quota
  grace_period?:    boolean;  // accès déjà payé, pas de redébit
  inscription_hint?: boolean;
  inscription_url?:  string;
  achat_hint?:       boolean;
  achat_url?:        string;
  solde_actuel?:     number;
  heures_reset?:     number;
  credits_debites?:  number;
}

// ── Type annonce minimal ──────────────────────────────────────────────────────
export interface TypeAnnonce {
  id:     string;
  nom:    string;
  actif?: boolean;
}

// ── Photo d'un bien ───────────────────────────────────────────────────────────
export interface BienPhoto {
  id:            string;
  url:           string;
  legende?:      string;
  is_principale: boolean;
}

// ── Bien immobilier — version aperçu (niveau gratuit) ─────────────────────────
export interface BienApercu {
  type_bien?: string;
  superficie: number | string | null;
  zone?:       string;
  _masque:     true;
}

// ── Parcelle ──────────────────────────────────────────────────────────────────
export interface Parcelle {
  id:          string;
  numero:      string;
  statut:      string;
  superficie?: number;
  lotissement?: {
    id: string;
    nom:        string;
    reference:  string;
    commune?:   string;
  };
  titre_foncier?: {
    numero:      string;
    est_verifie: boolean;
  };
}

// ── Bien complet (niveaux standard / complet) ─────────────────────────────────
export interface BienDetail {
  id:                      string;
  type_bien?:              { id: string, nom: string };
  type_transaction:        string;
  type_transaction_display?: string;
  localisation_approx?:    string;
  superficie?:             number;
  prix_principal?:         number;
  duree_bail_min_mois?:    number;
  caution_mois?:           number;
  is_verified?:            boolean;
  photos?:                 BienPhoto[];
  parcelle?:               Parcelle;
  arrondissement_nom:      string;
  ville_label: string;  // ← Ville de référence
  categorie_bien?: {     // ← Catégorie du bien
    id: string;
    nom: string;
    icone: string;
    couleur: string;
  };
}

// ── Auteur / validateur (mini info) ──────────────────────────────────────────
export interface UserMini {
  id:         string;
  username:   string;
  avatar?:    string;
}

// ── Annonce complète (serialize selon niveau) ─────────────────────────────────
// Les champs optionnels sont absents selon le niveau d'accès.
export interface Annonce {
  id:             string;
  titre:          string;
  statut:         StatutAnnonce;
  prix?:          number;
  vues:           number;
  image_principale?: string;
  created_at:     string;
  type_annonce:   TypeAnnonce;
  auteur?:        string;         // UUID (complet)
  auteur_nom:     string;
  auteur_info?:   UserMini;       // standard / complet
  date_debut?:    string;
  date_fin?:      string;
  est_active?:    boolean;
  jours_restants?: number | null;

  // Contenu — présent selon niveau
  contenu?:       string;         // complet : texte entier
  contenu_apercu?: string;        // visiteur / gratuit : tronqué

  // Bien — présent selon niveau
  bien?:          BienDetail;     // standard / complet
  bien_apercu?:   BienApercu;     // gratuit uniquement

  // Admin uniquement
  validee_par?:    string;
  validee_par_nom?: string;
  validee_par_info?: UserMini;
  date_validation?: string;
  motif_rejet?:    string;
  nb_commentaires?: number;
  nb_conversations?: number;

  // Bloc accès injecté par le backend
  _acces?:        AccesMeta;
}

// ── Item de liste (AnnonceListSerializer) ─────────────────────────────────────
export interface AnnonceListItem {
  id:             string;
  titre:          string;
  statut:         StatutAnnonce;
  prix:           string | null;
  vues:           number;
  image_principale?: string;
  created_at:     string;
  type_annonce:   TypeAnnonce;
  auteur?:        string;
  auteur_nom:     string;
  date_debut?:    string;
  date_fin?:      string;
  est_active?:    boolean;
  jours_restants?: number | null;
  bien?:          BienMini;
  motif_rejet?: string;
  type_bien_annonce:   TypeBienAnnonce | null;
  espace_evenementiel: EspaceMini | null;
}

export interface PaginatedAnnonceResponse {
  count: number;
  total_pages: number;
  current_page: number;
  next: string | null;
  previous: string | null;
  results: AnnonceListItem[];
  has_next: boolean;
  has_previous: boolean;
}

// ── Payloads d'écriture ───────────────────────────────────────────────────────
export interface CreateAnnonce {
  bien_id:          string;
  type_annonce_id:  string;
  date_debut:       string;
  date_fin?:        string;
  titre?:           string;
  contenu?:         string;
  image_principale?: File;
}

export interface UpdateAnnonce {
  titre?:           string;
  contenu?:         string;
  type_annonce_id?: string;
  date_debut?:      string;
  date_fin?:        string;
  bien_id?:         string;
  image_principale?: File;
}

// ── Erreur quota (HTTP 429) ───────────────────────────────────────────────────
export interface QuotaError {
  code:           string;   // QUOTA_VISITEUR_ATTEINT | QUOTA_UTILISATEUR_ATTEINT
  message:        string;
  heures_reset:   number;
  inscription_url?: string;
  achat_url?:     string;
  solde?:         number;
}
export type TypeBienAnnonce = 'IMMOBILIER' | 'EVENEMENTIEL';

export interface TarifEspace {
  id:          string;
  unite:       string;  // HEURE | DEMI_J | JOURNEE | WEEKEND | SEMAINE | MOIS
  unite_label: string;
  prix:        number;
  duree_min:   number;
}

export interface EquipementEspace {
  id:          string;
  nom:         string;
  inclus:      boolean;
  prix_option: number | null;
  icone:       string;
}

export interface BienMini {
  id:                      string;
  type_transaction:        string;
  type_transaction_display:string;
  type_bien_nom:           string | null;
  type_bien_categorie:     string | null;
  type_bien_icone:         string | null;
  localisation_approx:     string;
  arrondissement_nom:      string | null;
  ville_label:             string;
  superficie:              number | null;
  prix_m2:                 number | null;
  loyer_mensuel:           number | null;
  prix_principal:          number | null;
  statut_bien:             string;
  is_verified:             boolean;
  duree_bail_min_mois:     number | null;
  caution_mois:            number | null;
  photo_principale:        string | null;
  photos?:                 any[];
}

export interface EspaceMini {
  id:                string;
  nom:               string;
  type_espace:       string;
  type_espace_label: string;
  localisation_approx: string;
  arrondissement_nom:  string | null;
  ville_label:         string;
  capacite_min:        number;
  capacite_max:        number;
  superficie_m2:       number | null;
  prix_principal:      number | null;
  tarifs:              TarifEspace[];
  equipements_inclus:  { nom: string; icone: string }[];
  statut:              string;
  is_verified:         boolean;
  photo_principale:    string | null;
}