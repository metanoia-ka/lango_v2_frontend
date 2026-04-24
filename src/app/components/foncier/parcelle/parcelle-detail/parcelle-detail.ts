import { 
  Component, 
  ElementRef, inject, Input, OnDestroy, 
  OnInit, signal, ViewChild 
} from '@angular/core';
import { RelativeTimePipe } from '../../../../pipe/relative-time.pipe';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ParcelleService } from '../../services/parcelle';
import { Subject, takeUntil } from 'rxjs';
import { 
  ParcelleDetail, STATUT_PARCELLE_BADGE, 
  STATUT_PARCELLE_LABELS, StatutParcelle 
} from '../../models/parcelle.model';
import { defaults as defaultControls } from 'ol/control';
import type { Map as OlMap } from 'ol';
import type VectorSourceType from 'ol/source/Vector';
import type { Geometry } from 'ol/geom';
import type OlFeature from 'ol/Feature';

@Component({
  selector: 'app-parcelle-detail-modal',
  imports: [CommonModule, RelativeTimePipe],
  templateUrl: './parcelle-detail.html',
  styleUrl: './parcelle-detail.scss'
})
export class ParcelleDetailModal implements OnInit, OnDestroy {

  @Input() parcelleId!: string;
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  readonly activeModal = inject(NgbActiveModal);
  private readonly svc = inject(ParcelleService);
  private readonly destroy$ = new Subject<void>();

  parcelle   = signal<ParcelleDetail | null>(null);
  loading    = signal(true);
  error      = signal('');
  mapReady   = signal(false);

  readonly STATUT_LABELS = STATUT_PARCELLE_LABELS;
  readonly STATUT_BADGE  = STATUT_PARCELLE_BADGE;
  private map!: OlMap;
  private vectorSource!: VectorSourceType<OlFeature<Geometry>>;

  // Référence OpenLayers (chargé dynamiquement)
  private olMap: any = null;

  ngOnInit(): void {
    this.svc.getParcelleById(this.parcelleId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: p => {
          this.parcelle.set(p);
          this.loading.set(false);
          // Init carte après que la vue soit prête
          setTimeout(() => this.initMap(), 100);
        },
        error: () => {
          this.error.set('Impossible de charger la parcelle.');
          this.loading.set(false);
        }
      });
  }

  private async initMap(): Promise<void> {
    const p = this.parcelle();
    if (!p || !this.mapContainer) return;

    // ── Tous les imports en haut, avant toute logique ──────
    const olModule      = await import('ol');
    const olLayer       = await import('ol/layer');
    const olSource      = await import('ol/source');
    const olFormat      = await import('ol/format/GeoJSON');
    const olStyle       = await import('ol/style');
    const olProj        = await import('ol/proj');
    const OlFeature     = (await import('ol/Feature')).default;
    const OlPoint       = (await import('ol/geom/Point')).default;

    const { Map, View }                          = olModule;
    const { Tile: TileLayer, Vector: VectorLayer } = olLayer;
    const { OSM, Vector: VectorSource }          = olSource;
    const GeoJSON                                = olFormat.default;
    const { Style, Fill, Stroke, Circle: CircleStyle } = olStyle;
    const { fromLonLat }                         = olProj;

    const container = this.mapContainer.nativeElement;
    container.innerHTML = '';

    const format   = new GeoJSON();
    const features = p.forme
      ? format.readFeatures(p.forme, {
          dataProjection:    'EPSG:4326',
          featureProjection: 'EPSG:3857',
        })
      : [];

    const vectorSource = new VectorSource({ features });
    const vectorLayer  = new VectorLayer({
      source: vectorSource,
      style: new Style({
        fill:   new Fill({ color: 'rgba(0, 135, 83, 0.15)' }),
        stroke: new Stroke({ color: '#008753', width: 2.5 }),
      }),
    });

    // ── Bornes — .map() synchrone car imports déjà résolus ──
    const borneFeatures = p.bornes
      .filter(b => b.point_geom?.coordinates)
    .map(b => {
        const [lng, lat] = b.point_geom!.coordinates;
        return new OlFeature({
          geometry: new OlPoint(fromLonLat([lng, lat])),
          borne: b,
        });
      });

    const borneSource = new VectorSource({ features: borneFeatures });
    const borneLayer  = new VectorLayer({
      source: borneSource,
      style: new Style({
        image: new CircleStyle({
          radius: 5,
          fill:   new Fill({ color: '#FCD116' }),
          stroke: new Stroke({ color: '#92400e', width: 1.5 }),
        }),
      }),
    });

    this.olMap = new Map({
      target: container,
      controls: defaultControls({ 
        zoom: false, rotate: false, attribution: false 
      }).extend([]),
      layers: [new TileLayer({ source: new OSM() }), vectorLayer, borneLayer],
      view:   new View({ center: [0, 0], zoom: 2 }),
    });

    if (features.length > 0) {
      this.olMap.getView().fit(vectorSource.getExtent(), {
        padding: [40, 40, 40, 40],
        maxZoom: 20,
      });
    } else if (p.bornes.length > 0) {
      const first = p.bornes.find(b => b.point_geom?.coordinates);
      if (first) {
        const [lng, lat] = first.point_geom!.coordinates;
        this.olMap.getView().setCenter(fromLonLat([lng, lat]));
        this.olMap.getView().setZoom(16);
      }
    }

    this.mapReady.set(true);
  }

  // ── Contrôles carte custom ────────────────────────────────
  mapZoomIn():  void { const v = this.map?.getView(); if (v) v.animate({ 
    zoom: (v.getZoom() ?? 7) + 1, duration: 250 }); 
  }
  mapZoomOut(): void { const v = this.map?.getView(); if (v) v.animate({ 
    zoom: (v.getZoom() ?? 7) - 1, duration: 250 }); 
  }
  mapFitAll():  void {
    if (!this.map || !this.vectorSource) return;
    const extent = this.vectorSource.getExtent();
    if (extent && isFinite(extent[0])) this.map.getView().fit(extent, 
      { 
        padding: [40, 40, 40, 40], 
        maxZoom: 70, 
        duration: 600 
      }
    );
  }

  getStatutLabel(s: StatutParcelle): string {
    return STATUT_PARCELLE_LABELS[s] ?? s;
  }

  getStatutBadge(s: StatutParcelle): string {
    return STATUT_PARCELLE_BADGE[s] ?? '';
  }

  ngOnDestroy(): void {
    this.olMap?.setTarget(undefined);
    this.destroy$.next();
    this.destroy$.complete();
  }

}
