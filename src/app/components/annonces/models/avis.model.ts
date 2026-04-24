// Avis
export interface Avis {
  id: string;
  annonce: string;
  auteur_nom: string;
  auteur_id: string;
  note: number;
  titre: string;
  commentaire: string;
  recommande: boolean;
  modere: boolean;
  est_auteur: boolean;
  est_vendor: boolean;
  reponse?: ReponseAvis;
  created_at: string;
  updated_at: string;
}

export interface ReponseAvis {
  id: string;
  contenu: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAvis {
  note: number;
  titre: string;
  commentaire: string;
  recommande: boolean;
}

export interface AvisStatistiques {
  note_moyenne: number | null;
  nb_avis: number;
  nb_recommandations: number;
  taux_recommandation: number;
  repartition_notes: { [key: string]: number };
}