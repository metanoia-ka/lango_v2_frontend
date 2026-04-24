export interface ZoneCompetenceAgent {
  id: string;
  agent_id: string;
  arrondissement_id: string;
  actif: boolean;
  priorite: 1 | 2;
  created_at: string;
  
  // Champs enrichis (lecture seule)
  agent_username?: string;
  agent_phone?: string | null;
  agent_nom_complet?: string;
  arrondissement_nom?: string;
  arrondissement_commune?: string | null;
  priorite_label?: string;
}

export interface ZoneCompetenceAgentList {
  id: string;
  agent_username: string;
  arrondissement_nom: string;
  actif: boolean;
  priorite: 1 | 2;
  priorite_label: string;
  created_at: string;
}

export interface AgentResume {
  id: string;
  username: string;
  phone: string | null;
  nb_zones_principales: number;
  nb_zones_secondaires: number;
}

export interface ArrondissementResume {
  id: string;
  nom: string;
  nb_agents_principaux: number;
  nb_agents_secondaires: number;
  zone_existante?: boolean;
  priorite_existante?: 1 | 2;
}

export interface ZoneCompetenceStats {
  total_agents: number;
  total_zones_actives: number;
  agents_sans_zone: number;
  repartition_par_priorite: {
    priorite_1?: number;
    priorite_2?: number;
  };
}

export interface CreateZoneCompetencePayload {
  agent_id: string;
  arrondissement_id: string;
  actif?: boolean;
  priorite: 1 | 2;
}

export interface UpdateZoneCompetencePayload {
  agent_id?: string;
  arrondissement_id?: string;
  actif?: boolean;
  priorite?: 1 | 2;
}

export interface BulkCreatePayload {
  agent_id: string;
  zones: Array<{
    arrondissement_id: string;
    priorite: 1 | 2;
  }>;
}

export interface BulkCreateResponse {
  created: ZoneCompetenceAgent[];
  errors: Array<{
    index: number;
    data: any;
    errors: Record<string, string[]>;
  }>;
  total_created: number;
  total_errors: number;
}