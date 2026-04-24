// ── Parcelle mini (référence dans les réponses) ───────────────────────────────

export interface ParcelleMini {
  id:         string;
  numero:     string;
  superficie?: number;
}

// ── Consultation parcelle ─────────────────────────────────────────────────────

export type TypeAcces = 'FICHE' | 'CHAINE' | 'DOSSIER';

export interface ConsultationParcelle {
  id:          string;
  parcelle:    string;
  type_acces:  TypeAcces;
  created_at:  string;
}

export interface ConsultationResponse {
  detail:      string;
  parcelle_id: string;
  parcelle:    any; // ParcelleDetail selon ton serializer foncier
}

// ── Réservation parcelle ──────────────────────────────────────────────────────

export type StatutReservation = 'ACTIVE' | 'EXPIREE' | 'ANNULEE' | 'CONVERTIE';

export interface ReservationParcelle {
  id:               string;
  parcelle:         string;
  parcelle_numero:  string;
  statut:           StatutReservation;
  statut_label:     string;
  duree_jours:      number;
  date_expiration:  string;
  notes:            string;
  est_active:       boolean;
  heures_restantes: number;
  created_at:       string;
}

export interface ReservationCreate {
  parcelle_id: string;
  notes?:      string;
}

// ── Comparaison parcelles ─────────────────────────────────────────────────────

export interface ComparaisonParcelles {
  id:               string;
  parcelles:        string[];
  parcelles_detail: ParcelleMini[];
  pdf_url:          string;
  created_at:       string;
}

export interface ComparaisonCreate {
  parcelle_ids: string[]; // 2 à 3 UUIDs
}

// ── Dossier foncier ───────────────────────────────────────────────────────────

export type StatutDossier = 'EN_COURS' | 'PRET' | 'EXPIRE';

export interface DossierFoncier {
  id:                      string;
  parcelle:                string;
  parcelle_numero:         string;
  statut:                  StatutDossier;
  statut_label:            string;
  pdf_url:                 string;
  pdf_genere_le:           string | null;
  pdf_expires:             string | null;
  pdf_valide:              boolean;
  jours_validite_restants: number;
  snapshot_json:           Record<string, any>;
  created_at:              string;
}

// ── Demande de contact ────────────────────────────────────────────────────────

export type StatutDemande = 'EN_ATTENTE' | 'TRANSMISE' | 'ACCEPTEE' | 'REFUSEE' | 'EXPIREE';

export interface DemandeContact {
  id:               string;
  parcelle:         string;
  parcelle_numero:  string;
  statut:           StatutDemande;
  statut_label:     string;
  message:          string;
  note_manager:     string;
  date_expiration:  string | null;
  created_at:       string;
}

export interface DemandeContactCreate {
  parcelle_id: string;
  message:     string; // min 20 caractères
}

// ── Alerte disponibilité ──────────────────────────────────────────────────────

export type StatutAlerte    = 'ACTIVE' | 'PAUSEE' | 'EXPIREE' | 'DECLENCHEE';
export type TypeCibleAlerte = 'PARCELLE' | 'ZONE' | 'LOTISSEMENT';

export interface AlerteDisponibilite {
  id:                string;
  type_cible:        TypeCibleAlerte;
  type_cible_label:  string;
  parcelle?:         string;
  lotissement?:      string;
  zone_texte:        string;
  statut:            StatutAlerte;
  statut_label:      string;
  dernier_debit:     string | null;
  nb_declenchements: number;
  created_at:        string;
}

export interface AlerteCreate {
  type_cible:      TypeCibleAlerte;
  parcelle_id?:    string;
  lotissement_id?: string;
  zone_texte?:     string;
}

// ── Visite lotissement ────────────────────────────────────────────────────────

export interface VisiteEnregistree {
  detail: string;
}