export enum FrequenceNewsletter {
  IMMEDIATE = 'IMMEDIATE',
  QUOTIDIEN = 'QUOTIDIEN',
  HEBDOMADAIRE = 'HEBDOMADAIRE'
}

export interface NewsletterStatut {
  abonne: boolean;
  subscription?: {
    id: string;
    actif: boolean;
    frequence: FrequenceNewsletter;
    types_souhaites: string[];
    types_souhaites_details: TypeAnnonceDetail[];
  };
}

export interface TypeAnnonceDetail {
  id: string;
  nom: string;
  icone: string;
  couleur: string;
}

export interface AuteurStatut {
  suivi: boolean;
  nb_abonnes: number;
  message: string;
  abonne: string;
}

export interface FollowEntry {
  auteur_id:  string;
  username:   string;
  depuis:     string;
  nb_abonnes: number;
}

export interface AbonneEntry {
  user_id:  string;
  username: string;
  date:   string;
}

export interface MesFollowsResponse {
  total:   number;
  follows: FollowEntry[];
}

export interface MesAbonnesResponse {
  total:   number;
  abonnes: AbonneEntry[];
}