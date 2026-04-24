import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, ChangeDetectorRef, signal, computed, inject, PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import {
  AdminMapFilters,
  AdminMapResponse, AdminMapService, LotissementMapItem, ParcelleLightItem,
  SridGroup
} from '../service/admin-map.service';

import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import { Style, Fill, Stroke, Text as OlText } from 'ol/style';
import GeoJSON from 'ol/format/GeoJSON';
import { fromLonLat } from 'ol/proj';
import { defaults as defaultControls } from 'ol/control';
import Attribution from 'ol/control/Attribution';
import type { Geometry } from 'ol/geom';
import type Feature from 'ol/Feature';

const STATUT_COLORS: Record<string, string> = {
  DISPONIBLE: '#008753',
  ATTRIBUEE:  '#2563EB',
  RESERVEE:   '#F59E0B',
  REFUSEE:    '#EF4444',
};

@Component({
  selector: 'app-admin-map',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-map.html',
  styleUrl: './admin-map.scss'
})
export class AdminMap implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  // ── État ─────────────────────────────────────────────────────
  data             = signal<AdminMapResponse | null>(null);
  loading          = signal(false);
  error            = signal<string | null>(null);
  selectedSrid     = signal<string | null>(null);
  selectedLot      = signal<LotissementMapItem | null>(null);
  selectedParcelle = signal<ParcelleLightItem | null>(null);
  sidebarOpen      = signal(true);

  readonly STATUTS       = Object.keys(STATUT_COLORS);
  readonly STATUT_COLORS = STATUT_COLORS;

  sridGroups = computed(() => {
    const d = this.data();
    if (!d) return [];
    return Object.values(d.par_srid).sort((a, b) => a.srid - b.srid);
  });

  activeSridGroup = computed(() => {
    const srid = this.selectedSrid();
    const d    = this.data();
    if (!srid || !d) return null;
    return d.par_srid[srid] ?? null;
  });

  totalParcelles = computed(() => {
    const d = this.data();
    if (!d) return 0;
    return Object.values(d.par_srid).reduce((acc, g) => {
      return acc
        + g.lotissements.reduce((a, l) => a + l.nb_parcelles, 0)
        + g.parcelles_orphelines.length;
    }, 0);
  });

  // ── OL ────────────────────────────────────────────────────────
  private map!: Map;
  /**
   * mapReady : true dès que ngAfterViewInit a appelé initMap().
   * dataWaiting : true si les données sont arrivées avant la carte.
   * Sans ce mécanisme, refreshMapLayers() est appelée dans load()→next()
   * alors que this.map est encore undefined → carte vide au chargement.
   */
  private mapReady    = false;
  private dataWaiting = false;

  private destroy$ = new Subject<void>();
  filterForm!: FormGroup;

  private platformId = inject(PLATFORM_ID);

  constructor(
    private svc: AdminMapService,
    private fb:  FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────
  ngOnInit(): void {
    this.filterForm = this.fb.group({
      localisation:    [''],
      titre_foncier:   [''],
      lotissement:     [''],
      srid:            [''],
      statut_parcelle: [''],
    });

    this.filterForm.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe((v: AdminMapFilters) => this.load(v));

    this.load();
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.initMap();
    this.mapReady = true;
    // Les données étaient déjà arrivées → on peut maintenant les afficher
    if (this.dataWaiting) {
      this.refreshMapLayers();
      this.dataWaiting = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.map?.setTarget(undefined as any);
  }

  // ── Chargement ───────────────────────────────────────────────
  load(filters?: AdminMapFilters): void {
    this.loading.set(true);
    this.error.set(null);

    this.svc.getCarteGlobale(filters).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (res) => {
        this.data.set(res);
        const keys = Object.keys(res.par_srid);
        if (keys.length && !this.selectedSrid()) {
          this.selectedSrid.set(keys[0]);
        }
        this.loading.set(false);
        this.cdr.detectChanges();

        if (this.mapReady) {
          this.refreshMapLayers();   // carte déjà dispo → afficher
        } else {
          this.dataWaiting = true;   // carte pas encore prête → attendre
        }
      },
      error: (err) => {
        let msg = 'Erreur lors du chargement.';
        if      (err.status === 0)   msg = 'Impossible de joindre le serveur.';
        else if (err.status === 401) msg = 'Session expirée. Veuillez vous reconnecter.';
        else if (err.status === 403) msg = 'Accès refusé. Vue réservée aux administrateurs.';
        else if (err.status === 404) msg = 'Endpoint introuvable (/api/v2/map/global/).';
        else if (err.status >= 500)  msg = `Erreur serveur (${err.status}).`;
        else if (err.error?.detail)  msg = err.error.detail;
        this.error.set(msg);
        this.loading.set(false);
      }
    });
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.load();
  }

  // ── Sélection ────────────────────────────────────────────────
  selectSrid(srid: string): void {
    this.selectedSrid.set(srid);
    this.selectedLot.set(null);
    this.selectedParcelle.set(null);
    this.zoomToSrid();
  }

  selectLotissement(lot: LotissementMapItem): void {
    this.selectedLot.set(lot);
    this.selectedParcelle.set(null);
    if (lot.geom) this.zoomToFeature(lot.geom as GeoJSON.Geometry);
  }

  selectParcelle(p: ParcelleLightItem): void {
    this.selectedParcelle.set(p);
    if (p.geom) this.zoomToFeature(p.geom as GeoJSON.Geometry);
  }

  backToSrid(): void { this.selectedLot.set(null); this.selectedParcelle.set(null); }
  backToLot():  void { this.selectedParcelle.set(null); }

  // ── OpenLayers ───────────────────────────────────────────────
  private initMap(): void {
    this.map = new Map({
      target: this.mapContainer.nativeElement,
      // Retirer zoom+rotate natifs OL ; garder attribution en mode réduit
      controls: defaultControls({ zoom: false, rotate: false, attribution: false }).extend([
        //new Attribution({ collapsible: true, collapsed: true }),
      ]),
      layers: [ new TileLayer({ source: new OSM() }) ],
      view: new View({ center: fromLonLat([12.35, 4.05]), zoom: 7 }),
    });
  }

  private refreshMapLayers(): void {
    if (!this.map) return;

    // Retirer les anciennes couches vectorielles
    const toRemove = this.map.getLayers().getArray().filter(
      (l) => (l as any).get('isData') === true
    );
    toRemove.forEach((l) => this.map.removeLayer(l));

    const d = this.data();
    if (!d) return;

    const parser    = new GeoJSON();
    const allFeats: Feature<Geometry>[] = [];  // pour le zoom global

    Object.values(d.par_srid as Record<string, SridGroup>).forEach((group) => {
      const features: Feature<Geometry>[] = [];

      group.lotissements.forEach((lot) => {
        if (!lot.geom) return;
        try {
          features.push(...parser.readFeatures(
            { type: 'Feature', geometry: lot.geom,
              properties: { type: 'lot', ...lot } },
            { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' }
          ) as Feature<Geometry>[]);
        } catch { /* geom invalide */ }
      });

      group.lotissements.forEach((lot) => {
        lot.parcelles.forEach((p) => {
          if (!p.geom) return;
          try {
            features.push(...parser.readFeatures(
              { type: 'Feature', geometry: p.geom,
                properties: { type: 'parcelle', statut: p.statut, numero: p.numero } },
              { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' }
            ) as Feature<Geometry>[]);
          } catch { /* geom invalide */ }
        });
      });

      group.parcelles_orphelines.forEach((p) => {
        if (!p.geom) return;
        try {
          features.push(...parser.readFeatures(
            { type: 'Feature', geometry: p.geom,
              properties: { type: 'orpheline', statut: p.statut, numero: p.numero } },
            { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' }
          ) as Feature<Geometry>[]);
        } catch { /* geom invalide */ }
      });

      if (!features.length) return;
      allFeats.push(...features);

      const layer = new VectorLayer({
        source: new VectorSource<Feature<Geometry>>({ features }),
        style: (feature) => {
          const props = feature.getProperties() as Record<string, any>;
          if (props['type'] === 'lot') {
            return new Style({
              stroke: new Stroke({ color: '#1A3557', width: 2.5, lineDash: [8, 4] }),
              fill:   new Fill({ color: 'rgba(26,53,87,0.08)' }),
            });
          }
          const color = STATUT_COLORS[props['statut'] as string] ?? '#6B7280';
          return new Style({
            stroke: new Stroke({ color, width: 1.5 }),
            fill:   new Fill({ color: color + '33' }),
            text:   new OlText({
              text:   props['numero'] as string ?? '',
              font:   '11px sans-serif',
              fill:   new Fill({ color: '#111827' }),
              stroke: new Stroke({ color: '#fff', width: 2 }),
            }),
          });
        },
      });

      (layer as any).set('isData', true);
      this.map.addLayer(layer);
    });

    // ── Zoom automatique sur toutes les features ──────────────────
    if (allFeats.length) {
      const tmpSrc = new VectorSource<Feature<Geometry>>({ features: allFeats });
      const extent = tmpSrc.getExtent();
      if (extent && isFinite(extent[0])) {
        this.map.getView().fit(extent, {
          padding:  [60, 320, 60, 60],  // 320 = largeur sidebar
          maxZoom:  40,
          duration: 700,
        });
      }
    }
  }

  private zoomToFeature(geom: GeoJSON.Geometry): void {
    const parser  = new GeoJSON();
    const feature = parser.readFeature(
      { type: 'Feature', geometry: geom, properties: {} },
      { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' }
    ) as Feature<Geometry>;
    const extent = feature.getGeometry()?.getExtent();
    if (!extent) return;
    this.map.getView().fit(extent, 
      { 
        padding: [60, 60, 60, 60], 
        maxZoom: 40, 
        duration: 600 
      });
  }

  private zoomToSrid(): void {
    const first = this.activeSridGroup()?.lotissements.find((l) => l.geom);
    if (first?.geom) this.zoomToFeature(first.geom as GeoJSON.Geometry);
  }

  // ── Contrôles carte (appelés depuis le template HTML) ────────
  mapZoomIn():  void { const v = this.map?.getView(); if (v) v.animate({ zoom: (v.getZoom() ?? 7) + 1, duration: 250 }); }
  mapZoomOut(): void { const v = this.map?.getView(); if (v) v.animate({ zoom: (v.getZoom() ?? 7) - 1, duration: 250 }); }
  mapFitAll():  void { this.refreshMapLayers(); }  // recalcule le zoom global

  // ── Utilitaires template ──────────────────────────────────────
  getStatutClass(statut: string): string {
    const m: Record<string, string> = {
      DISPONIBLE: 'badge-disponible', ATTRIBUEE: 'badge-attribuee',
      RESERVEE:   'badge-reservee',   REFUSEE:   'badge-refusee',
    };
    return m[statut] ?? 'badge-default';
  }

  getStatutLabel(statut: string): string {
    const m: Record<string, string> = {
      DISPONIBLE: 'Disponible', ATTRIBUEE: 'Attribuée',
      RESERVEE:   'Réservée',   REFUSEE:   'Refusée',
    };
    return m[statut] ?? statut;
  }

  formatSuperficie(m2: number | string): string {
    const v = parseFloat(String(m2));
    if (isNaN(v)) return '—';
    return v >= 10000 ? `${(v / 10000).toFixed(4)} ha` : `${v.toFixed(2)} m²`;
  }

  get hasActiveFilters(): boolean {
    return Object.values(this.filterForm.value).some((x) => !!x);
  }

  countParcelles(group: SridGroup): number {
    return group.lotissements.reduce((acc, l) => acc + l.nb_parcelles, 0);
  }
}