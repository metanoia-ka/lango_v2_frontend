export type StatutAssignation = 'EN_ATTENTE' | 'EN_COURS' | 'TRAITEE' | 'EXPIREE';
export type StatutVerification = 'APPROUVEE' | 'SIGNALEE';

export interface AssignationTicket {
  id: string;
  statut: StatutAssignation;
  statut_label: string;
  zone_overflow: boolean;
  assigned_at: string;
  
  // Champs de l'annonce (via AssignationDetailSerializer)
  annonce_titre: string;
  annonce_prix: string | null;
  type_annonce_nom: string;
  type_transaction: string | null;
  localisation: string | null;
  arrondissement_nom: string | null;
  auteur_nom: string;
  photo_principale: string | null;
}

export interface AgentStats {
  en_attente: number;
  traitees_aujourd_hui: number;
  approuvees_aujourd_hui: number;
  signalees_aujourd_hui: number;
}

// Pour l'appel POST /approuver/
export interface ApprouverRequest {
  localisation_verifiee?: string;
}

// Pour l'appel POST /signaler/
export interface SignalerRequest {
  motif: string;
  localisation_verifiee?: string;
}

export interface VerdictResponse {
  detail: string;
}