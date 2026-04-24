export interface CrsMetadata {
  epsg_code:      number;
  name:           string;
  type:           string;
  area_of_use:    [number, number, number, number] | null; // [west, south, east, north]
  datum:          string | null;
  ellipsoid:      string | null;
  is_geographic:  boolean;
  is_projected:   boolean;
  units:          string | null;
}

export type CrsOperation =
  | 'transformation'
  | 'distance_calculation'
  | 'area_calculation'
  | 'grid_operations'
  | 'gps_compatible';

export interface CoordinateSystem {
  id:                   string;
  nom:                  string;
  srid:                 number;
  description:          string;
  created_at:           string;
  // présents uniquement sur retrieve (CoordinateSystemDetailSerializer)
  metadata?:            CrsMetadata;
  supported_operations?: CrsOperation[];
}

export interface CoordinateSystemCreatePayload {
  nom:          string;
  srid:         number;
  description?: string;
}

// Labels d'affichage pour les opérations supportées
export const CRS_OPERATION_LABELS: Record<CrsOperation, string> = {
  transformation:      'Transformation',
  distance_calculation:'Calcul de distances',
  area_calculation:    'Calcul de surfaces',
  grid_operations:     'Opérations sur grille',
  gps_compatible:      'Compatible GPS',
};

export const CRS_OPERATION_ICON: Record<CrsOperation, string> = {
  transformation:       'bi-arrow-left-right',
  distance_calculation: 'bi-rulers',
  area_calculation:     'bi-bounding-box',
  grid_operations:      'bi-grid-3x3',
  gps_compatible:       'bi-geo-alt-fill',
};
