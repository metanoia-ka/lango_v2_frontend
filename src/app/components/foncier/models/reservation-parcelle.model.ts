export interface ParcellePourReservation {
  id:          string;
  numero:      string;
  statut:      string;
  superficie?: number;
  lotissement?: {
    id: string;
    nom:        string;
  };
}

export interface ReservationCreate {
  parcelle_ids:       string[];       // 1 ou 2 UUIDs
  annonce_source_id?: string;         // UUID de l'annonce depuis laquelle on arrive
}
 
export interface OffreCreate {
  reservation_id: string;
  prix_vendeur:   number;             // Prix proposé par le client (XAF/m²)
}
 
export interface OffreContreProposition {
  prix_contre_propose: number;        // Contre-proposition du vendor
}
 
export type OffreStatut =
  | 'EN_ATTENTE'
  | 'ACCEPTEE'
  | 'REFUSEE'
  | 'EXPIREE'
  | 'CONTRE_PROPOSEE'
  | 'NEGOCIATION';
 
export interface Offre {
  id:                  string;
  reservation_id:      string;
  parcelle_numero:     string;
  lotissement_nom:     string;
  acheteur_nom:        string;
  vendeur_nom:         string;
  prix_propose:        number;
  prix_vendeur:        number;
  prix_client?:        number;
  prix_final?:         number;
  client_nom:          string;
  type_prix:           string;
  prix_contre_propose?: number;
  statut:              OffreStatut;
  tour:                number;        // numéro de négociation
  expire_le:           string;
  created_at:          string;
  updated_at:          string;
}
 
export type ReservationStatut =   'EN_ATTENTE' 
                                | 'ATTRIBUEE' 
                                | 'EXPIREE' 
                                | 'ANNULEE'
                                | 'NEGOCIATION';
 
export interface Reservation {
  id:               string;
  parcelle:         string;           // UUID
  parcelle_numero:  string;
  parcelle_statut:  string;
  lotissement_nom:  string;
  //purchaser_nom:    string;
  client_nom:       string;
  statut:           ReservationStatut;
  credits_debites:  number;
  jours_restants:   number;
  est_expiree:      boolean;
  offre_active?:    Offre | null;     // offre en cours pour cette réservation
  created_at:       string;
  expire_le:        string;
  updated_at:       string;
}
 
export interface ReservationResponse {
  reservations:    Reservation[];
  erreurs:         { parcelle_id: string; erreur: string }[];
  nb_reservations: number;
}
 
export interface CreditsInsuffisantsError {
  code:   'CREDITS_INSUFFISANTS';
  detail: string;
  solde:  number;
  cout:   number;
}