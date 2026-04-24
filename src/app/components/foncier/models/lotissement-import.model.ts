export interface BorneImportee {
  x:      number;
  y:      number;
  label?: string | null;
}

export interface ParseResult {
  nb_bornes:       number;
  bornes:          BorneImportee[];
  srid_detecte:    number | null;   // null = l'user doit choisir
  meta:            Record<string, any>;
  avertissements:  string[];
}

export interface ConfirmImportPayload {
  nom:                           string;
  localisation:                  string;
  systeme:                       string;   // UUID du CoordinateSystem
  titre_foncier:                 string;   // UUID
  date_creation_administrative?: string;
  bornes:                        BorneImportee[];
}

export interface ImportConfirmResult {
  lotissement:    any;
  nb_bornes:      number;
  geom_generee:   boolean;
  avertissements: string[];
}

// Formats supportés côté frontend (label + extensions + description)
export interface FormatFichier {
  id:          string;
  label:       string;
  extensions:  string[];   // ex. ['.xlsx', '.xls']
  accept:      string;     // attribut HTML accept
  description: string;
  icone:       string;
  srid_auto:   boolean;    // true si le format embarque le SRID
}

export const FORMATS_IMPORT: FormatFichier[] = [
  {
    id: 'excel', label: 'Excel',
    extensions: ['.xlsx', '.xls'],
    accept: '.xlsx,.xls',
    description: 'Colonnes X/Y (ou E/N, Easting/Northing). En-tête obligatoire.',
    icone: 'bi-file-earmark-excel-fill',
    srid_auto: false,
  },
  {
    id: 'csv', label: 'CSV / Texte',
    extensions: ['.csv', '.txt'],
    accept: '.csv,.txt',
    description: 'Fichier texte séparé par virgule, point-virgule ou tabulation.',
    icone: 'bi-filetype-csv',
    srid_auto: false,
  },
  {
    id: 'pdf', label: 'PDF',
    extensions: ['.pdf'],
    accept: '.pdf',
    description: `Plan de lotissement en PDF. 
                  Extraction automatique des tableaux de coordonnées.`,
    icone: 'bi-file-earmark-pdf-fill',
    srid_auto: false,
  },
  {
    id: 'shapefile', label: 'Shapefile',
    extensions: ['.shp', '.zip'],
    accept: '.shp,.zip',
    description: `Fichier .shp ou archive .zip contenant .shp + .shx + .dbf 
                  (+ .prj recommandé).`,
    icone: 'bi-file-earmark-zip-fill',
    srid_auto: true,
  },
  {
    id: 'dxf', label: 'DXF / DWG',
    extensions: ['.dxf', '.dwg'],
    accept: '.dxf,.dwg',
    description: `Fichier AutoCAD. DXF recommandé. 
                  DWG nécessite ODA File Converter côté serveur.`,
    icone: 'bi-vector-pen',
    srid_auto: false,
  },
  {
    id: 'geojson', label: 'GeoJSON',
    extensions: ['.geojson', '.json'],
    accept: '.geojson,.json',
    description: 'Format GeoJSON standard (WGS84 par défaut).',
    icone: 'bi-braces',
    srid_auto: true,
  },
  {
    id: 'kml', label: 'KML / KMZ',
    extensions: ['.kml', '.kmz'],
    accept: '.kml,.kmz',
    description: 'Format Google Earth (WGS84 — coordonnées en degrés décimaux).',
    icone: 'bi-geo-alt-fill',
    srid_auto: true,
  },
];