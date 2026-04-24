// ─────────────────────────────────────────────────────────────────────────────
// notification.model.ts
// ─────────────────────────────────────────────────────────────────────────────

// Types de base (reprend le backend + 3 nouveaux)
export type NotificationType =
  | 'VERIFICATION'
  | 'CORRECTION'
  | 'VALIDATION'
  | 'REJET'
  | 'INFO'
  | 'SYSTEM'
  | 'DOCUMENT_REQUIS'  // ← nouveau : demande de pièces justificatives
  | 'ACTION_REQUISE'   // ← nouveau : confirmation / choix attendu de l'utilisateur
  | 'RAPPEL'       // ← nouveau : rappel automatique (expiration, délai…)
  | 'RENDEZ_VOUS'
  | 'PROMOTION'
  | 'ALERTE'
  | 'MESSAGE';

// Type d'action embarquée dans la notification (champ `data`)
export type NotificationActionType =
  | 'fournir_documents'   // upload de fichiers
  | 'confirmer_action'    // bouton Oui / Non
  | 'ouvrir_conversation' // rediriger vers une conversation
  | 'voir_annonce'        // rediriger vers une annonce
  | 'lien_externe'        // URL externe
  | null;

// Document demandé à l'utilisateur
export interface DocumentRequis {
  id: string;
  nom: string;                     // ex: "CIN recto"
  description?: string;            // ex: "Photo lisible de votre pièce d'identité"
  formats_acceptes: string[];      // ['pdf', 'jpg', 'png']
  taille_max_mo?: number;          // ex: 5
  obligatoire: boolean;
}

// Payload stocké dans `data` (JSONField backend)
export interface NotificationData {
  type_action: NotificationActionType;
  label_bouton?: string;           // texte du bouton CTA dans la notif
  documents_requis?: DocumentRequis[];
  conversation_id?: string;
  annonce_id?: string;
  url?: string;
  options?: { label: string; valeur: string }[]; // pour confirmer_action
  [key: string]: any;
}

// Modèle principal retourné par l'API / WebSocket
export interface NotifClient {
  id: string;
  titre: string;
  message: string;
  type: NotificationType;
  lue: boolean;
  icone: string;          // calculé par le serializer
  couleur: string;        // idem
  depuis: string;         // "il y a 3 minutes"
  date_creation: string;
  lien?: string | null;
  data: NotificationData;
  personne_nom?: string | null;
}

// Stats endpoint
export interface NotificationStats {
  total: number;
  non_lues: number;
  par_type: Record<string, number>;
}

// Payload envoi admin → API
export interface EnvoyerNotifPayload {
  titre: string;
  message: string;
  type: NotificationType;
  lien?: string;
  data?: Partial<NotificationData>;
  expire_le?: string;
  // ciblage (mutuellement exclusifs)
  user_id?: string;
  user_ids?: string[];
  role?: string;
}

// Réponse de l'utilisateur (upload docs)
export interface ReponseNotification {
  notification_id: string;
  action: string;
  message?: string;
  fichiers?: File[];
}