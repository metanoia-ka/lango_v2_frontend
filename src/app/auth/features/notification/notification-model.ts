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

export interface PieceJointe {
  id:           string;
  nom_original: string;
  taille:       number | null;
  date_upload:  string;
  url:          string;
  type:         'local' | 'externe';
}

export interface NotificationClient {
  id: string;
  titre: string;
  message: string;
  type: NotificationType;
  lue: boolean;
  date_creation: string;
  date_lecture?: string;
  depuis: string;
  icone: string;
  couleur: string;
  lien?: string;
  personne_nom?: string;
  data?: NotificationData;
  expire_le?: string;
  deja_repondu:  boolean;
  pieces_jointes: PieceJointe[];
}

export interface NotificationTypeConfig {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  textColor: string;
}

export const NOTIFICATION_TYPES: Record<string, NotificationTypeConfig> = {
  'VERIFICATION': {
    label: 'Vérification',
    icon: 'bi-shield-check',
    color: 'primary',
    bgColor: 'bg-primary',
    textColor: 'text-primary'
  },
  'CORRECTION': {
    label: 'Correction demandée',
    icon: 'bi-exclamation-triangle',
    color: 'warning',
    bgColor: 'bg-warning',
    textColor: 'text-warning'
  },
  'VALIDATION': {
    label: 'Validation',
    icon: 'bi-check-circle',
    color: 'success',
    bgColor: 'bg-success',
    textColor: 'text-success'
  },
  'REJET': {
    label: 'Rejet',
    icon: 'bi-x-circle',
    color: 'danger',
    bgColor: 'bg-danger',
    textColor: 'text-danger'
  },
  'INFO': {
    label: 'Information',
    icon: 'bi-info-circle',
    color: 'info',
    bgColor: 'bg-info',
    textColor: 'text-info'
  },
  'SYSTEM': {
    label: 'Système',
    icon: 'bi-gear',
    color: 'secondary',
    bgColor: 'bg-secondary',
    textColor: 'text-secondary'
  },
  'RENDEZ_VOUS':
  {
    label: 'Rendez-vous', 
    icon: 'bi-calendar-check', 
    color: '#0f1111',
    bgColor: '#f9fafb',
    textColor: 'text-primary'
  },
  'PROMOTION':
  { label: 'Promotion', 
    icon: 'bi-megaphone', 
    color: '#111c79',
    bgColor: '#f9fafb',
    textColor: 'text-secondary'
  },
  'ALERTE':
  { label: 'Alerte', 
    icon: 'bi-exclamation-triangle', 
    color: '#cc0631',
    bgColor: '#f9fafb',
    textColor: 'text-warning'  
  },
  'MESSAGE':
  { label: 'Message', 
    icon: 'bi-chat-dots', 
    color: '#5319f3',
    bgColor: '#f9fafb',
    textColor: 'text-success'  
  }
};