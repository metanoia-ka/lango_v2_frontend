export type ActionTypeReponse =
  | 'fournir_documents'
  | 'confirmer_action'
  | 'ouvrir_conversation'
  | 'autre';

export interface FichierReponse {
  id:           string;
  nom_document: string;
  nom_original: string;
  taille:       number;
  mime_type:    string;
  date_upload:  string;
  url:          string;
}

export interface NotificationReponse {
  id:                 string;
  notification:       string;
  notification_titre: string;
  utilisateur:        string;
  utilisateur_nom:    string;
  action:             ActionTypeReponse;
  message:            string | null;
  data:               Record<string, any>;
  fichiers:           FichierReponse[];
  date_reponse:       string;
  traitee:            boolean;
  traitee_le:         string | null;
}

export interface EnvoyerReponsePayload {
  notification_id: string;
  action:          ActionTypeReponse;
  message?:        string;
  fichiers?:       File[];
}
