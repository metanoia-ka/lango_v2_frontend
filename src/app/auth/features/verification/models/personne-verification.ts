export interface PersonneVerification {
  id: string;
  nom: string;
  prenom?: string;
  type_personne: 'PHYSIQUE' | 'MORALE';
  statut_verification: string;
  est_verifie: boolean;
  commentaire_verification?: string;
  preuve_legale_url?: string;
  date_creation: string;
  jours_attente: number;
}

export interface VerificationStats {
  total: number;
  en_attente: number;
  valide: number;
  rejete: number;
  a_corriger: number;
  en_cours: number;
  sans_preuve: number;
  en_attente_longue: number;
  par_type: { physique: number; morale: number };
}

export interface VerificationPersonne {
  id: string;
  nom: string;
  prenom?: string;
  type_personne: 'PHYSIQUE' | 'MORALE';
  cin?: string;
  numero_registre?: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  preuve_legale_url?: string;
  est_verifie: boolean;
  statut_verification: 'EN_ATTENTE' | 'VALIDE' | 'REJETE' | 'A_CORRIGER' | 'EN_COURS';
  commentaire_verification?: string;
  verifie_par_details?: { username: string; phone: string };
  date_verification?: string;
  date_creation: string;
  jours_attente: number;
  representant_details?: any;
  peut_etre_verifie: boolean;
  user_details?: { username: string; phone: string; roles: string[] };
}

export interface VerificationAction {
  action: 'valider' | 'rejeter' | 'a_corriger' | 'en_cours';
  commentaire?: string;
  notifier_utilisateur?: boolean;
}