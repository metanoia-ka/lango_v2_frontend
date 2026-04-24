import { GeoJSONPolygon } from "./partage-foncier.model";

export interface CoordinateSystem {
  id:   string;
  nom:  string;
  srid: number;
}

export interface LotissementStatistiques {
  total_parcelles:    number;
  surface_occupee:    number;
  surface_disponible: number;
  par_statut:         Record<string, number>;
}

export interface Lotissement {
  id:                            string;
  nom:                           string;
  localisation:                  string;
  reference:                     string;
  geom:                          GeoJSONPolygon | null;
  geom_native:                   GeoJSONPolygon | null;
  superficie_totale:             string;
  systeme:                       string;
  systeme_nom?:                  string;
  systeme_srid?:                 number;
  systeme_info?:                 CoordinateSystem;
  proprietaire:                  number | null;
  proprietaire_nom?:             string | null;
  titre_foncier:                 string;
  tf_lotissement:                string;
  titre_foncier_numero?:         string;
  parcelles?:                    any[];
  date_creation_administrative:  string | null;
  est_actif:                     boolean;
  nb_bornes?:                    number;
  nb_parcelles?:                 number;
  statistiques?:                 LotissementStatistiques;
  created_ago?:                  string;
  created_at:                    string;
  updated_at:                    string;
}

export interface LotissementCreatePayload {
  nom:                           string;
  localisation:                  string;
  systeme:                       string;
  titre_foncier:                 string;
  proprietaire?:                 number;
  date_creation_administrative?: string;
}