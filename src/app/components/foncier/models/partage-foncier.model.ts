export interface PaginatedResponse<T> {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  T[];
}

export interface GeoJSONPoint {
  type:        'Point';
  coordinates: [number, number];
}

export interface GeoJSONPolygon {
  type:        'Polygon';
  coordinates: number[][][];
}