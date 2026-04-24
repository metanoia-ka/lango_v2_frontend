// ── Plans ─────────────────────────────────────────────────────────────────────

export interface PlanAbonnement {
  id: string;
  nom: string;
  niveau: 'ESSENTIEL' | 'PROFESSIONNEL' | 'AGENCE';
  description: string;
  prix_mensuel_fcfa: number;
  nb_annonces_max: number;   // -1 = illimité
  est_illimite: boolean;
  nb_boosts_inclus: number;
  stats_avancees: boolean;
  export_stats: boolean;
  annonce_epinglee: boolean;
  ordre: number;
  est_actif: boolean;
}

// ── Historique renouvellements ────────────────────────────────────────────────

export interface HistoriqueRenouvellement {
  id: string;
  plan: string;
  date_debut_cycle: string;
  date_fin_cycle: string;
  montant_fcfa: number;
  reference_paiement: string;
  created_at: string;
}

// ── Abonnement actif ──────────────────────────────────────────────────────────

export interface AbonnementVendor {
  id: string;
  plan: string;
  plan_detail: PlanAbonnement;
  statut: 'ACTIF' | 'EXPIRE' | 'RESILIE' | 'SUSPENDU';
  statut_label: string;
  date_debut: string;
  date_fin: string;
  date_prochain_renouvellement?: string;
  quota_annonces_total: number;
  quota_annonces_restant: number;
  boosts_restants: number;
  renouvellement_auto: boolean;
  peut_publier: boolean;
  jours_restants: number;
  est_actif: boolean;
  historique: HistoriqueRenouvellement[];
  created_at: string;
}

// ── Check publication ─────────────────────────────────────────────────────────

export interface PeutPublier {
  peut_publier: boolean;
  message: string;
  quota_restant: number | null;
  jours_restants: number | null;
  plan: string | null;
}

// ── Boosts ────────────────────────────────────────────────────────────────────

export interface BoostAnnonce {
  id: string;
  annonce: string;
  vendor: string;
  statut: 'ACTIF' | 'EXPIRE' | 'ANNULE';
  source: 'CREDITS' | 'PLAN';
  source_label: string;
  date_debut: string;
  date_fin: string;
  duree_jours: number;
  est_actif: boolean;
  created_at: string;
}

export interface BoostCreate {
  annonce_id: string;
  duree_jours: 7 | 15 | 30;
  source: 'CREDITS' | 'PLAN';
}

// ── Alertes recherche ─────────────────────────────────────────────────────────

export interface AlerteRecherche {
  id: string;
  statut: 'ACTIVE' | 'PAUSEE' | 'EXPIREE';
  statut_label: string;
  zone: string;
  prix_min?: number;
  prix_max?: number;
  superficie_min?: number;
  superficie_max?: number;
  type_transaction: string;
  type_bien: string;
  dernier_debit?: string;
  created_at: string;
}

export interface AlerteCreate {
  zone?: string;
  prix_min?: number;
  prix_max?: number;
  superficie_min?: number;
  superficie_max?: number;
  type_transaction?: string;
  type_bien?: string;
}
