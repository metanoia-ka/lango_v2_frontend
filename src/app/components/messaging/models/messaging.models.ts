export type MessageStatut = 'NOUVEAU' | 'LU' | 'REPONDU' | 'ARCHIVE';

export interface MessageReponse {
  id:            string;
  contenu:       string;
  admin_nom:     string;
  created_at:    string;
  notif_envoyee: boolean;
  email_envoye:  boolean;
}

export interface PieceJointe {
  nom:    string;
  taille: number;
  url:    string;
}

export interface Message {
  id:             string;
  sender_email:   string;
  sender_nom:     string;
  sender_user?:   string;
  est_visitor:    boolean;
  sender_role?:   string;
  en_ligne:       boolean;
  objet:          string;
  contenu:        string;
  statut:         MessageStatut;
  created_at:     string;
  lu_le?:         string;
  nb_reponses:    number;
  piece_jointe?:  PieceJointe | null;
  pj_nom_original?: string;
  pj_taille?:     number;
  pj_url?:        string;
  reponses:       MessageReponse[];
}

export interface MessageStats {
  total:   number;
  nouveau: number;
  lu:      number;
  repondu: number;
  archive: number;
}

export interface MessageCreatePayload {
  sender_email: string;
  sender_nom:   string;
  objet:        string;
  contenu:      string;
  piece_jointe?: File | null;
}

// ── presence.models.ts ────────────────────────────────────────────────────────

export type PresenceStatus = 'online' | 'offline';

export interface PresenceUser {
  user_id:      string;
  user_nom:     string;
  user_email:   string;
  user_role:    string | null;
  en_ligne:     boolean;
  derniere_vue: string;
}

export interface PresenceUpdate {
  type:        'presence_update';
  user_id:     string;
  user_nom:    string;
  user_email:  string;
  user_role:   string;
  status:      PresenceStatus;
  timestamp:   string;
}

export interface PresenceInit {
  type:  'presence_init';
  users: PresenceUser[];
}

// ── ws-message.models.ts — types de messages WebSocket reçus ─────────────────

export type WsPresenceEvent = PresenceInit | PresenceUpdate;
