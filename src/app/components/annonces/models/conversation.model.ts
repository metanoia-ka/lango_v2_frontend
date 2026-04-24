// Conversation
export interface Conversation {
  id: string;
  annonce_titre: string;
  annonce_id: string;
  annonce_image?: string;
  vendor_nom: string;
  vendor_id: string;
  purchaser_nom: string;
  purchaser_id: string;
  messages: Message[];
  dernier_message?: {
    id: string;
    auteur: string;
    contenu: string;
    created_at: string;
    lu: boolean;
  };
  nb_messages_non_lus: number;
  fermee: boolean;
  fermee_par?: string;
  est_vendor: boolean;
  prix_accord?: number | null;
  est_purchaser: boolean;
  created_at: string;
  updated_at: string;
}

// Message
export interface Message {
  id: string;
  conversation: string;
  auteur_nom: string;
  auteur_id: string;
  contenu: string;
  est_mon_message: boolean;
  est_lu: boolean;
  lu_le?: string;
  created_at: string;
}

export interface CreateMessage {
  contenu: string;
  fichier?: File;
}

export interface CreateConversation {
  annonce_id: string;
  message_initial?: string;
}

export type StatutOffrePrix =
  | 'EN_ATTENTE'
  | 'ACCEPTEE'
  | 'REFUSEE'
  | 'CONTRE_PROPOSEE'
  | 'EXPIREE';

export interface OffrePrix {
  id:             string;
  conversation:   string;
  initiateur:     string;
  initiateur_nom: string;
  prix_propose:   number;
  prix_final:     number | null;
  message:        string;
  statut:         StatutOffrePrix;
  tour:           number;
  created_at:     string;
  repondu_le:     string | null;
  est_mon_offre:  boolean;
}

export interface EnvoyerOffrePayload {
  prix_propose: number;
  message?:     string;
}

export interface RepondreOffrePayload {
  action:       'accepter' | 'refuser' | 'contre_proposer';
  nouveau_prix?: number;
  message?:     string;
}