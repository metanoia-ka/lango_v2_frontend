export interface SystemeCoordonnees {
  id: string;
  nom: string;
  srid: number;
  description: string;
  created_at: string;
  metadata?: {
    epsg_code: number;
    name: string;
    type: string;
    area_of_use?: [number, number, number, number];
    datum?: string;
    ellipsoid?: string;
    is_geographic: boolean;
    is_projected: boolean;
    units?: string;
  };
  supported_operations: string[];
}

export interface CoordinateSystemDetail extends SystemeCoordonnees {
  metadata?: {
    epsg_code: number;
    name: string;
    type: string;
    area_of_use?: [number, number, number, number];
    datum?: string;
    ellipsoid?: string;
    is_geographic: boolean;
    is_projected: boolean;
    units?: string;
  };
  supported_operations: string[];
}