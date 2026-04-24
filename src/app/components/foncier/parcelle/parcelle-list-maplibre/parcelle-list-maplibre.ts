import {
  Component, computed, ElementRef, inject, OnDestroy, OnInit,
  PLATFORM_ID, signal, ViewChild
} from '@angular/core';
import { RelativeTimePipe } from '../../../../pipe/relative-time.pipe';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { NgbModal, NgbPaginationModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ParcelleService } from '../../services/parcelle';
import { LotissementService } from '../../services/lotissement';
import { AdminMapService, ParcelleLightItem } from '../../admin/service/admin-map.service';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';
import { Lotissement } from '../../models/lotissement.model';
import { Parcelle, STATUT_PARCELLE_BADGE, STATUT_PARCELLE_LABELS, StatutParcelle } from '../../models/parcelle.model';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { ParcelleForm } from '../parcelle-form/parcelle-form';
import { ParcelleDetailModal } from '../parcelle-detail/parcelle-detail';

// import type uniquement — jamais exécuté côté SSR
import type { Map as MaplibreMap, LngLatBoundsLike } from 'maplibre-gl';

// ── Couleurs statut ───────────────────────────────────────────────────────────
const STATUT_COLORS: Record<string, string> = {
  DISPONIBLE: '#008753',
  ATTRIBUEE:  '#2563EB',
  RESERVEE:   '#F59E0B',
  REFUSEE:    '#EF4444',
};

// Style Stadia Stamen — "Stamen Toner Lite" : fond clair, très épuré, gratuit
const STADIA_STYLE = 'https://tiles.stadiamaps.com/styles/alidade_smooth.json';
//const STADIA_STYLE = 'https://tiles.stadiamaps.com/styles/osm_bright.json';
//const STADIA_STYLE = 'https://tiles.stadiamaps.com/styles/alidade_satellite.json';
//alidade_satellite.json → imagerie satellite + bâtiments
//const STADIA_STYLE = 'https://tiles.stadiamaps.com/styles/stamen_toner_lite.json';


@Component({
  selector: 'app-parcelle-list-maplibre',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    NgbTooltipModule, NgbPaginationModule,
    RelativeTimePipe,
  ],
  templateUrl: './parcelle-list-maplibre.html',
  styleUrl:    './parcelle-list-maplibre.scss',
  providers:   [DatePipe],
})
export class ParcelleListMaplibre implements OnInit, OnDestroy {

  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  // ── Injections ────────────────────────────────────────────────────────────
  private platformId   = inject(PLATFORM_ID);
  private route        = inject(ActivatedRoute);
  private router       = inject(Router);
  private modal        = inject(NgbModal);
  private datePipe     = inject(DatePipe);
  private svc          = inject(ParcelleService);
  private lotSvc       = inject(LotissementService);
  private sam          = inject(AdminMapService);
  private confirmation = inject(ConfirmationService);

  // ── État général ──────────────────────────────────────────────────────────
  lotissement!: Lotissement;
  lotissementId  = signal('');
  lotissementNom = signal('');
  lotissementRef = signal('');
  totalParcelles = signal(0);
  loading        = signal(false);
  error          = signal('');

  parcelles   = signal<Parcelle[]>([]);
  total       = signal(0);
  page        = signal(1);
  pageSize    = 10;
  searchQuery = signal('');
  totalPages  = computed(() => Math.ceil(this.total() / this.pageSize));

  parcellesLight   = signal<ParcelleLightItem[]>([]);
  selectedParcelle = signal<ParcelleLightItem | null>(null);

  stats = computed(() => {
    const ps = this.parcelles();
    return {
      disponible: ps.filter(p => p.statut === 'DISPONIBLE').length,
      attribuee:  ps.filter(p => p.statut === 'ATTRIBUEE').length,
      reservee:   ps.filter(p => p.statut === 'RESERVEE').length,
      refusee:    ps.filter(p => p.statut === 'REFUSEE').length,
    };
  });

  activeView = signal<'table' | 'map'>('table');

  statutCtrl = new FormControl<string>('');
  readonly STATUTS       = ['', 'DISPONIBLE', 'ATTRIBUEE', 'RESERVEE', 'REFUSEE'];
  readonly STATUT_LABELS = STATUT_PARCELLE_LABELS;
  readonly STATUT_BADGE  = STATUT_PARCELLE_BADGE;
  readonly statutKeys    = Object.keys(STATUT_PARCELLE_LABELS) as StatutParcelle[];

  // ── MapLibre — instance privée ────────────────────────────────────────────
  private mlMap!: MaplibreMap;
  private mapInitialized = false;

  private destroy$ = new Subject<void>();
  private search$  = new Subject<string>();

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params['id'];
      if (!id) { this.router.navigate(['/lango/lotissements']); return; }
      this.lotissementId.set(id);
      this.loadAll();
    });

    this.statutCtrl.valueChanges.pipe(
      debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$)
    ).subscribe(() => { this.page.set(1); this.loadAll(); });

    this.search$.pipe(
      debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$)
    ).subscribe(() => { this.page.set(1); this.loadParcelles(); });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.mlMap?.remove();
  }

  // ── Chargement ────────────────────────────────────────────────────────────
  loadAll(): void {
    this.loadParcelles();
    this.loadParcellesLight();
    this.loadLotissement();
  }

  loadParcelles(): void {
    const id = this.lotissementId();
    if (!id) return;
    this.loading.set(true);
    this.error.set('');
    this.svc.getAll(this.page(), this.searchQuery(), id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.parcelles.set(res);
          this.total.set(res.length);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger les parcelles.');
          this.loading.set(false);
        },
      });
  }

  loadParcellesLight(): void {
    const id     = this.lotissementId();
    const statut = this.statutCtrl.value || undefined;
    if (!id) return;
    this.sam.getParcellesLotissement(id, statut).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: res => {
        this.lotissementNom.set(res.lotissement);
        this.lotissementRef.set(res.reference);
        this.totalParcelles.set(res.total_parcelles);
        this.parcellesLight.set(res.parcelles);
        // Si la carte est prête → mettre à jour les couches
        //if (this.mapInitialized) this.refreshMapLayers();
        if (this.mapInitialized && this.mlMap) {
          setTimeout(() => this.refreshMapLayers(), 50); // petit délai souvent utile
        }
      },
      error: err => {
        this.error.set(err.status === 403
          ? 'Accès refusé pour la vue carte.'
          : err.error?.detail ?? 'Erreur chargement carte.');
      }
    });
  }

  private loadLotissement(): void {
    const id = this.lotissementId();
    if (!id) return;
    this.lotSvc.getById(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => this.lotissement = res,
      error: () => {},
    });
  }

  hasParcellesWithoutGeometry = computed(() =>
    !this.loading() &&
    this.parcellesLight().length > 0 &&
    this.parcellesLight().every(p => !p.geom)
  );

  // ── Toggle vue ────────────────────────────────────────────────────────────
  switchView(v: 'table' | 'map'): void {
    this.activeView.set(v);
    if (v === 'map' && isPlatformBrowser(this.platformId) && !this.mapInitialized) {
      setTimeout(() => this.initMap(), 100);
    }
  }

  // ── Initialisation MapLibre ───────────────────────────────────────────────
  private async initMap(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.mapContainer?.nativeElement)  return;
    if (this.mapInitialized) return;

    const { Map: MaplibreMap } = await import('maplibre-gl');

    this.mlMap = new MaplibreMap({
      container:          this.mapContainer.nativeElement,
      style:              STADIA_STYLE,
      center:             [12.35, 4.05],
      zoom:               30,
      attributionControl: false,
    }) as MaplibreMap;

    this.mlMap.on('load', () => {
      this.mapInitialized = true;

      // Ajouter les sources et couches GeoJSON
      this.addMapSources();

      // Ajout des bâtiments en 3D (extrusion)
      this.mlMap.addLayer({
  'id': '3d-buildings',
  'source': 'openmaptiles',           // source présente dans la plupart des styles Stadia
  'source-layer': 'building',
  'type': 'fill-extrusion',
  'minzoom': 14,
  'paint': {
    'fill-extrusion-color': '#d1d5db',     // gris clair
    'fill-extrusion-height': ['coalesce', ['get', 'render_height'], ['get', 'height'], 0],
    'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
    'fill-extrusion-opacity': 0.75
  }
}, 'parcelles-fill');   // ← on met les bâtiments en dessous de tes parcelles

      // Afficher les parcelles déjà chargées
      //this.refreshMapLayers();
      if (this.parcellesLight().length > 0) {
        this.refreshMapLayers();
      }

      // Clic sur une parcelle
      this.mlMap.on('click', 'parcelles-fill', (e: any) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const id    = feature.properties['id'];
        const found = this.parcellesLight().find(p => p.id === id) ?? null;
        this.selectedParcelle.set(found);
        this.updateSelectionStyle();
      });

      // Curseur pointer au survol
      this.mlMap.on('mouseenter', 'parcelles-fill', () => {
        this.mlMap.getCanvas().style.cursor = 'pointer';
      });
      this.mlMap.on('mouseleave', 'parcelles-fill', () => {
        this.mlMap.getCanvas().style.cursor = '';
      });
    });

    this.mlMap.on('error', (e: any) => {
      //console.error('Erreur MapLibre:', e);
    });
  }

  // ── Ajout des sources et couches MapLibre ─────────────────────────────────
  private addMapSources(): void {
    // Source GeoJSON vide — sera remplie par refreshMapLayers()
    this.mlMap.addSource('parcelles', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });

    // Couche remplissage polygones
    this.mlMap.addLayer({
      id:     'parcelles-fill',
      type:   'fill',
      source: 'parcelles',
      paint: {
        'fill-color': [
          'match', ['get', 'statut'],
          'DISPONIBLE', '#008753',
          'ATTRIBUEE',  '#2563EB',
          'RESERVEE',   '#F59E0B',
          'REFUSEE',    '#EF4444',
          '#6B7280'
        ],
        'fill-opacity': [
          'case',
          ['==', ['get', 'selected'], true], 0.6,
          0.55
        ],
      }
    }, 'water');

    // === HYBRID : Routes, contours et labels par-dessus le satellite ===
this.mlMap.addLayer({
  id: 'hybrid-roads',
  type: 'line',
  source: 'openmaptiles',           // source déjà présente dans Alidade Satellite
  'source-layer': 'transportation',
  minzoom: 12,
  paint: {
    'line-color': '#ffffff',
    'line-width': [
      'interpolate', ['linear'], ['zoom'],
      12, 1,
      16, 3
    ],
    'line-opacity': 0.85
  }
}, 'parcelles-fill');   // Important : sous tes parcelles

// Routes principales plus visibles
this.mlMap.addLayer({
  id: 'hybrid-roads-major',
  type: 'line',
  source: 'openmaptiles',
  'source-layer': 'transportation',
  filter: ['in', 'class', 'motorway', 'trunk', 'primary'],
  paint: {
    'line-color': '#f8fafc',
    'line-width': 4,
    'line-opacity': 0.9
  }
}, 'hybrid-roads');

// Labels (noms de rues, villages, etc.)
this.mlMap.addLayer({
  id: 'hybrid-labels',
  type: 'symbol',
  source: 'openmaptiles',
  'source-layer': 'place',
  layout: {
    'text-field': ['get', 'name'],
    'text-size': 12,
    'text-anchor': 'center'
  },
  paint: {
    'text-color': '#ffffff',
    'text-halo-color': '#1e2937',
    'text-halo-width': 1.5
  }
}, 'parcelles-fill');

    // Couche bordures polygones
    this.mlMap.addLayer({
      id:     'parcelles-stroke',
      type:   'line',
      source: 'parcelles',
      paint: {
        'line-color': [
          'match', ['get', 'statut'],
          'DISPONIBLE', '#008753',
          'ATTRIBUEE',  '#2563EB',
          'RESERVEE',   '#F59E0B',
          'REFUSEE',    '#EF4444',
          '#6B7280'
        ],
        'line-width': [
          'case',
          ['==', ['get', 'selected'], true], 3,
          1.5
        ],
        'line-opacity': 0.9,
      }
    }, 'parcelles-fill');

    // Couche labels numéros de parcelles
    this.mlMap.addLayer({
      id:     'parcelles-labels',
      type:   'symbol',
      source: 'parcelles',
      layout: {
        'text-field':  ['get', 'numero'],
        'text-size':   12,                    // tu peux monter à 13-14 si tu veux plus gros
        'text-anchor': 'center',
        //'text-font':   ['Noto Sans Bold', 'Arial Unicode MS Bold'], // police plus visibl
      },
      paint: {
        'text-color':        '#14171b',
        'text-halo-color':   '#ffffff', //'#111827'
        'text-halo-width':   2,
      }
    }, 'parcelles-stroke');
  }

  // ── Mise à jour des données sur la carte ──────────────────────────────────
  refreshMapLayers(): void {
    if (!this.mapInitialized || !this.mlMap) return;

    const source = this.mlMap.getSource('parcelles') as any;
    if (!source) return;

    const selectedId = this.selectedParcelle()?.id;
    const parcelles  = this.parcellesLight().filter(p => p.geom);

    const geojson = {
      type: 'FeatureCollection' as const,
      features: parcelles.map(p => ({
        type:     'Feature' as const,
        geometry: p.geom!,
        properties: {
          id:         p.id,
          numero:     p.numero,
          statut:     p.statut,
          superficie: p.superficie,
          nom:        p.nom,
          selected:   p.id === selectedId,
        },
      })),
    };

    source.setData(geojson);
    console.log('GeoJSON features envoyées :', geojson.features.length);
    if (geojson.features.length > 0) {
      console.log('Premier feature geometry type :', geojson.features[0].geometry.type);
    }

    // Auto-zoom sur toutes les parcelles
    if (parcelles.length) {
      const bounds = this.computeBounds(parcelles);
      if (bounds) {
        this.mlMap.fitBounds(bounds as LngLatBoundsLike, {
          padding:  { top: 40, bottom: 40, left: 40, right: 40 },
          maxZoom:  40,
          duration: 600,
        });
      }
    }
  }

  // Met à jour uniquement la propriété "selected" sans recharger toutes les données
  private updateSelectionStyle(): void {
    this.refreshMapLayers();
  }

  // ── Zoom sur une parcelle spécifique ──────────────────────────────────────
  zoomToParcelle(p: ParcelleLightItem): void {
    if (!this.mlMap) return;
    this.selectedParcelle.set(p);
    this.refreshMapLayers();

    if (!p.geom) return;
    const bounds = this.computeBoundsFromGeom(p.geom);
    if (bounds) {
      this.mlMap.fitBounds(bounds as LngLatBoundsLike, {
        padding:  { top: 60, bottom: 60, left: 60, right: 60 },
        maxZoom:  40,
        duration: 500,
      });
    }
  }

  // ── Contrôles carte custom ────────────────────────────────────────────────
  mapZoomIn(): void {
    this.mlMap?.easeTo({ zoom: (this.mlMap.getZoom() ?? 7) + 1, duration: 250 });
  }

  mapZoomOut(): void {
    this.mlMap?.easeTo({ zoom: (this.mlMap.getZoom() ?? 7) - 1, duration: 250 });
  }

  mapFitAll(): void {
    if (!this.mlMap) return;
    const bounds = this.computeBounds(this.parcellesLight().filter(p => p.geom));
    if (bounds) {
      this.mlMap.fitBounds(bounds as LngLatBoundsLike, {
        padding:  { top: 40, bottom: 40, left: 40, right: 40 },
        maxZoom:  40,
        duration: 600,
      });
    }
  }

  // ── Utilitaires bbox ──────────────────────────────────────────────────────
  private computeBounds(
    parcelles: ParcelleLightItem[]
  ): [number, number, number, number] | null {
    let minLng =  Infinity, minLat =  Infinity;
    let maxLng = -Infinity, maxLat = -Infinity;
    let found  = false;

    for (const p of parcelles) {
      if (!p.geom) continue;
      for (const [lng, lat] of this.extractCoords(p.geom)) {
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
        found = true;
      }
    }
    return found ? [minLng, minLat, maxLng, maxLat] : null;
  }

  private computeBoundsFromGeom(
    geom: GeoJSON.Geometry
  ): [number, number, number, number] | null {
    let minLng =  Infinity, minLat =  Infinity;
    let maxLng = -Infinity, maxLat = -Infinity;
    let found  = false;

    for (const [lng, lat] of this.extractCoords(geom)) {
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
      found = true;
    }
    return found ? [minLng, minLat, maxLng, maxLat] : null;
  }

  private extractCoords(geom: GeoJSON.Geometry): [number, number][] {
    switch (geom.type) {
      case 'Point':
        return [geom.coordinates as [number, number]];
      case 'MultiPoint':
      case 'LineString':
        return geom.coordinates as [number, number][];
      case 'MultiLineString':
      case 'Polygon':
        return (geom.coordinates as [number, number][][]).flat();
      case 'MultiPolygon':
        return (geom.coordinates as [number, number][][][]).flat(2);
      case 'GeometryCollection':
        return geom.geometries.flatMap(g => this.extractCoords(g));
      default:
        return [];
    }
  }

  // ── Actions CRUD ──────────────────────────────────────────────────────────
  goToLotissement(): void { this.router.navigate(['/lango/lotissements']); }
  onSearch(q: string): void { this.searchQuery.set(q); this.search$.next(q); }
  onPageChange(p: number): void { this.page.set(p); this.loadParcelles(); }

  openCreate(): void {
    const ref = this.modal.open(ParcelleForm, { size: 'lg', centered: true });
    if (this.lotissementId()) ref.componentInstance.lotissementId = this.lotissementId();
    ref.result.then(r => {
      if (r === 'saved') {
        this.loadAll();
        this.confirmation.inform({
          context: 'create', title: 'Parcelle créée', type: 'bg-success',
          closeLabel: 'Ok', message: 'La parcelle a été créée avec succès.'
        });
      }
    }, () => {});
  }

  openEdit(p: Parcelle): void {
    const ref = this.modal.open(ParcelleForm, { size: 'lg', centered: true });
    ref.componentInstance.parcelle = p;
    ref.result.then(r => {
      if (r === 'saved') {
        this.loadAll();
        this.confirmation.inform({
          context: 'update', title: 'Parcelle modifiée',
          message: 'La parcelle a été modifiée avec succès.',
          type: 'bg-info', closeLabel: 'Ok'
        });
      }
    }, () => {});
  }

  openDetail(p: Parcelle): void {
    this.modal.open(ParcelleDetailModal, { size: 'lg', centered: true, scrollable: true })
      .componentInstance.parcelleId = p.id;
  }

  changeStatut(p: Parcelle, statut: StatutParcelle): void {
    this.svc.updateStatut(p.id, statut).pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  () => this.loadAll(),
        error: () => this.error.set('Mise à jour impossible.')
      });
  }

  async onDelete(p: Parcelle): Promise<void> {
    const formattedDate = this.datePipe.transform(p.created_at, 'dd/MM/yyyy');
    const confirmed = await this.confirmation.confirm({
      title: 'Confirmation', type: 'bg-danger',
      message: `Êtes-vous sûr de vouloir supprimer cette parcelle ? 
      Cette action est irréversible.`,
      icon: 'bi-trash', confirmLabel: 'Oui, supprimer', cancelLabel: 'Annuler',
      zonePhraseOne:   `Nom : ${p.nom}`,
      zonePhraseTwo:   `Numéro : ${p.numero}`,
      zonePhraseThree: `Créée le : ${formattedDate}`,
      requireMotif: true, motifMinLength: 10, size: 'lg',
    });
    if (!confirmed) return;
    const motif = typeof confirmed === 'string' ? confirmed : 'Suppression demandée';
    this.svc.delete(p.id, motif).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.loadAll();
        this.confirmation.inform({
          context: 'delete', title: 'Parcelle supprimée',
          message: `"${p.nom}" a été supprimée définitivement.`,
          type: 'bg-danger', closeLabel: 'Ok'
        });
      },
      error: err => this.error.set(err?.error?.detail ?? 'Suppression impossible.'),
    });
  }

  // ── Utilitaires template ──────────────────────────────────────────────────
  getStatutClass(statut: string): string {
    const m: Record<string, string> = {
      DISPONIBLE: 'badge-disponible', ATTRIBUEE: 'badge-attribuee',
      RESERVEE:   'badge-reservee',   REFUSEE:   'badge-refusee'
    };
    return m[statut] ?? '';
  }

  getStatutLabel(statut: string): string {
    const m: Record<string, string> = {
      DISPONIBLE: 'Disponible', ATTRIBUEE: 'Attribuée',
      RESERVEE:   'Réservée',   REFUSEE:   'Refusée'
    };
    return m[statut] ?? statut;
  }

  formatSuperficie(m2: number): string {
    if (!m2) return '—';
    return m2 >= 10000 ? `${(m2 / 10000).toFixed(4)} ha` : `${m2.toFixed(2)} m²`;
  }

  trackById(_: number, item: Parcelle): string { return item.id; }
}