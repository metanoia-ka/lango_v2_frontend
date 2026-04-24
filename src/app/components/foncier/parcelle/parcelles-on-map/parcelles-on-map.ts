
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import {
  Component, OnInit, OnDestroy, 
  ViewChild, ElementRef, inject, signal, computed, PLATFORM_ID,
  Input,
  AfterViewInit
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormControl } from '@angular/forms';
import { 
  NgbPaginationModule, 
  NgbTooltipModule 
} from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';

import type { Map as OlMap } from 'ol';
import type { Geometry } from 'ol/geom';
import type OlFeature from 'ol/Feature';
import type VectorSourceType from 'ol/source/Vector';
import type VectorLayerType from 'ol/layer/Vector';

import { 
  AdminMapService, 
  ParcelleLightItem 
} from '../../admin/service/admin-map.service';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';
import {
  Parcelle, STATUT_PARCELLE_BADGE,
  STATUT_PARCELLE_LABELS, StatutParcelle
} from '../../models/parcelle.model';
import { Lotissement } from '../../models/lotissement.model';
import { Authentication } from '../../../../auth/core/authentication';
import { ToastService } from '../../../../services/toast.service';
import { ReservationService } from '../../services/reservation';
import { ReservationCreate } from '../../models/reservation-parcelle.model';
import { CreditService } from '../../../finance/services/credit';

const STATUT_COLORS: Record<string, string> = {
  DISPONIBLE: '#008753',
  ATTRIBUEE:  '#2563EB',
  RESERVEE:   '#F59E0B',
  REFUSEE:    '#EF4444',
};

@Component({
  selector: 'app-parcelles-on-map',
  standalone: true,
  imports: [CommonModule,
    NgbTooltipModule, NgbPaginationModule],
  templateUrl: './parcelles-on-map.html',
  styleUrl: './parcelles-on-map.scss'
})
export class ParcellesOnMap implements OnInit, OnDestroy, AfterViewInit  {

  @Input() lotissementId_input: string = '';
  @Input() annonceId: string | null = null;
  
  private activeModal = inject(NgbActiveModal);

  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  // ── Injections ────────────────────────────────────────────
  private platformId   = inject(PLATFORM_ID);

  private auth         = inject(Authentication);
  private sam          = inject(AdminMapService);
  private confirmation = inject(ConfirmationService);
  private toast        = inject(ToastService);
  private reservationSvc  = inject(ReservationService);
  private creditSvc       = inject(CreditService);

  // ── État général ──────────────────────────────────────────
  lotissement!: Lotissement;
  lotissementId  = signal('');
  lotissementNom = signal('');
  lotissementRef = signal('');
  totalParcelles = signal(0);
  loading        = signal(false);
  error          = signal('');
  success        = signal('');

  parcelles   = signal<Parcelle[]>([]);

  parcellesLight   = signal<ParcelleLightItem[]>([]);
  selectedParcelle = signal<ParcelleLightItem | null>(null);

  hasPermission = computed(() => this.auth.hasAnyRole(['Admin', 'Manager', 'Vendor']));

  // Sélection multiple (max 2 parcelles)
  parcellesSelectionnees = signal<ParcelleLightItem[]>([]);
  MAX_SELECTION = 2;
  MAX_RESERVATION = 20;

  activeView = signal<'table' | 'map'>('map');

  statutCtrl = new FormControl<string>('');
  readonly STATUTS       = ['', 'DISPONIBLE', 'ATTRIBUEE', 'RESERVEE', 'REFUSEE'];
  readonly STATUT_LABELS = STATUT_PARCELLE_LABELS;
  readonly STATUT_BADGE  = STATUT_PARCELLE_BADGE;
  readonly statutKeys    = Object.keys(STATUT_PARCELLE_LABELS) as StatutParcelle[];

  parcelleCount: any[] = [
    { id: 1, statut: 'DISPONIBLE' },
    { id: 2, statut: 'ATTRIBUEE' },
    { id: 3, statut: 'RESERVEE' },
    { id: 4, statut: 'REFUSEE' }
  ];

  // ── OL — uniquement des types, jamais d'instances au niveau classe ─
  // Toutes les instances OL sont créées dans initMap() après isPlatformBrowser.
  private map!:          OlMap;
  private vectorSource!: VectorSourceType<OlFeature<Geometry>>;
  private vectorLayer!:  VectorLayerType;
  private geoJsonParser: any = null;  // instance GeoJSON stockée après initMap()

  private destroy$ = new Subject<void>();

  // ── Lifecycle ─────────────────────────────────────────────
  ngOnInit(): void {
    const id = this.lotissementId_input;
    if (id) {
      this.lotissementId.set(id);
      this.loadParcellesLight();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.map?.setTarget(undefined as any);
  }

  ngAfterViewInit(): void {}

  private loadParcellesLight(): void {
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

        if (!this.map) {
          setTimeout(() => this.initMap(), 80);
        } else {
          this.refreshMapFeatures();
        }
      },
      error: err => {
        this.loading.set(false);
        this.error.set(err.error?.detail ?? 'Impossible de charger les parcelles.');
      }
    });
  }

  hasParcellesWithoutGeometry = computed(() =>
    !this.loading() &&
    this.parcellesLight().length > 0 &&
    this.parcellesLight().every(p => !p.geom)
  );

  // ── Toggle vue ────────────────────────────────────────────
  switchView(v: 'map'): void {
    this.activeView.set(v);
    if (v === 'map') {
      if (!isPlatformBrowser(this.platformId)) return;
      setTimeout(() => this.initMap(), 50);
    } else {
      if (this.map) {
        this.map.setTarget(undefined as any);
        this.map = undefined!;
      }
    }
  }

  // Sélection de parcelle sur la carte (click)
  toggleSelectionParcelle(p: ParcelleLightItem): void {
    if (p.statut !== 'DISPONIBLE') return; // seules les disponibles sont sélectionnables

    const sel = this.parcellesSelectionnees();
    const idx = sel.findIndex(s => s.id === p.id);

    if (idx >= 0) {
      this.parcellesSelectionnees.set(sel.filter(s => s.id !== p.id));
    } else {
      if (sel.length >= this.MAX_SELECTION) {
        this.error.set(`Vous ne pouvez sélectionner que 
                        ${this.MAX_SELECTION} parcelles au maximum.`);
        this.toast.showError(`Maximum ${this.MAX_SELECTION} parcelles.`);
        return;
      }
      this.parcellesSelectionnees.set([...sel, p]);
    }
    this.vectorLayer?.changed(); // redessiner pour mettre à jour la couleur sélectionnée
  }

  estSelectionnee(p: ParcelleLightItem): boolean {
    if (!p) return false;
    return this.parcellesSelectionnees().some(s => s.id === p.id);
  }

  async reserverParcelles(): Promise<void> {

    const sel = this.parcellesSelectionnees();
    if (!sel.length) {
      this.error.set('Sélectionnez au moins une parcelle.');
      this.toast.showError('Sélectionnez au moins une parcelle.');
      return;
    }

    const coutTotal = sel.length * this.MAX_RESERVATION;
    const ok = await this.confirmation.confirm({
      title:        'Confirmer la réservation',
      type:         'bg-success',
      message:      sel.length === 1
        ? `Réserver la parcelle ${sel[0].numero} (${sel[0].superficie?.toFixed(2)} m²) ?`
        : `Réserver ${sel.length} parcelles : ${sel.map(p => p.numero).join(', ')} ?`,
      icon:         'bi-calendar-check',
      confirmLabel: `Confirmer (${coutTotal} crédit${coutTotal > 1 ? 's' : ''})`,
      cancelLabel:  'Annuler',
    });
    if (!ok) return;

    this.loading.set(true);
    this.error.set('');

    const payload: ReservationCreate = {
      parcelle_ids:      sel.map(p => p.id),
      annonce_source_id: this.annonceId ?? undefined,
    };

    this.reservationSvc.creerReservation(payload).subscribe({
    next: (resp) => {
      this.loading.set(false);
      this.success.set(
        `${resp.nb_reservations} 
          parcelle${resp.nb_reservations > 1 ? 's' : ''} 
          réservée${resp.nb_reservations > 1 ? 's' : ''} 
          ! Le vendeur a été notifié.`
          );
      this.creditSvc.getSolde().subscribe();
      this.parcellesSelectionnees.set([]);
      this.loadParcellesLight();
      this.toast.showSuccess(
        `${resp.nb_reservations} 
        parcelle${resp.nb_reservations > 1 ? 's' : ''} 
        réservée${resp.nb_reservations > 1 ? 's' : ''} ! 
        Le vendeur a été notifié.`
      );
    },
    error: (err) => {
      this.loading.set(false);
      if (err.status === 402) {
        this.error.set(err.error?.detail);
      } else if (err.status === 409) {
        this.error.set(err.error?.detail ?? 'Quota de réservations atteint (max 2).');
      } else if (err.status === 400) {
        const erreurs = err.error?.erreurs as {parcelle_id: string; erreur: string}[];
        this.error.set(
          erreurs?.length
            ? erreurs.map(e => e.erreur).join(' / ')
            : err.error?.detail ?? 'Erreur lors de la réservation.'
        );
      } else {
        this.error.set(err.error?.detail ?? 'Erreur inattendue.');
      }
    }
  });
  }

  private async initMap(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.mapContainer?.nativeElement) return;

    if (this.map) {
      this.map.setTarget(undefined as any);
      this.map = undefined!;
    }

    const [
      { default: OlMap },
      { default: View },
      { default: TileLayer },
      { default: VectorLayer },
      { default: OSM },
      { default: VectorSource },
      { Style, Fill, Stroke, Text: OlText },
      { default: GeoJSON },
      { fromLonLat },
      { defaults: defaultControls },
      { default: Attribution },
    ] = await Promise.all([
      import('ol/Map'),
      import('ol/View'),
      import('ol/layer/Tile'),
      import('ol/layer/Vector'),
      import('ol/source/OSM'),
      import('ol/source/Vector'),
      import('ol/style'),
      import('ol/format/GeoJSON'),
      import('ol/proj'),
      import('ol/control'),
      import('ol/control/Attribution'),
    ]);

    this.vectorSource = new VectorSource();
    this.geoJsonParser = new GeoJSON();  // stocké pour refreshMapFeatures()

    this.vectorLayer = new VectorLayer({
      source: this.vectorSource,
      style: (feature) => {
        const props      = feature.getProperties() as Record<string, any>;
        const color      = STATUT_COLORS[props['statut']] ?? '#6B7280';
        const isSelected = this.selectedParcelle()?.id === props['id'];
        return new Style({
          stroke: new Stroke({ 
            color: isSelected ? '#111827' : color, width: isSelected ? 3 : 1.5 
          }),
          fill:   new Fill({ color: isSelected ? color + '88' : color + '33' }),
          text:   new OlText({
            text:   props['numero'] ?? '',
            font:   '12px sans-serif',
            fill:   new Fill({ color: '#111827' }),
            stroke: new Stroke({ color: '#fff', width: 2 }),
          }),
        });
      },
    });

    this.map = new OlMap({
      target: this.mapContainer.nativeElement,
      controls: defaultControls({ 
        zoom: false, rotate: false, attribution: false 
      }).extend([]),
      layers: [
        new TileLayer({ source: new OSM() }),
        this.vectorLayer,
      ],
      view: new View({ center: fromLonLat([12.35, 4.05]), zoom: 7 }),
    });

    this.map.on('click', (evt) => {
      const feature = this.map.forEachFeatureAtPixel(
        evt.pixel, f => f
      ) as OlFeature<Geometry> | undefined;
      if (feature) {
        const props = feature.getProperties() as Record<string, any>;
        this.selectedParcelle.set(this.parcellesLight().find(
          p => p.id === props['id']) ?? null
        );
      } else {
        this.selectedParcelle.set(null);
      }
      this.vectorLayer?.changed();
    });

    this.refreshMapFeatures();
  }

  private refreshMapFeatures(): void {
    if (!this.vectorSource || !this.map || !this.geoJsonParser) return;
    this.vectorSource.clear();
    const features: OlFeature<Geometry>[] = [];

    for (const p of this.parcellesLight()) {
      if (!p.geom) continue;
      try {
        features.push(...this.geoJsonParser.readFeatures(
          { type: 'Feature', geometry: p.geom,
            properties: 
            { id: p.id, numero: p.numero, statut: p.statut, superficie: p.superficie } 
          },
          { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' }
        ));
      } catch { /* géom invalide */ }
    }

    this.vectorSource.addFeatures(features);
    if (features.length) {
      const extent = this.vectorSource.getExtent();
      this.map.getView().fit(extent, { 
        padding: [40, 40, 40, 40], 
        maxZoom: 40, 
        duration: 600 
      });
    }
  }

  zoomToParcelle(p: ParcelleLightItem): void {
    if (!p.geom || !this.map || !this.geoJsonParser) return;
    this.selectedParcelle.set(p);
    const feature = this.geoJsonParser.readFeature(
      { type: 'Feature', geometry: p.geom, properties: {} },
      { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' }
    ) as OlFeature<Geometry>;
    const extent = feature.getGeometry()?.getExtent();
    if (extent) this.map.getView().fit(extent, { 
      padding: [60, 60, 60, 60], maxZoom: 18, duration: 500 
    });
    this.vectorLayer?.changed();
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

  // ── Utilitaires template ──────────────────────────────────
  getStatutClass(statut: string): string {
    const m: Record<string, string> = { 
      DISPONIBLE: 'badge-disponible', 
      ATTRIBUEE: 'badge-attribuee', 
      RESERVEE: 'badge-reservee', 
      REFUSEE: 'badge-refusee' 
    };
    return m[statut] ?? '';
  }

  getStatutLabel(statut: string): string {
    const m: Record<string, string> = { 
      DISPONIBLE: 'Disponible', 
      ATTRIBUEE: 'Attribuée', 
      RESERVEE: 'Réservée', 
      REFUSEE: 'Refusée' 
    };
    return m[statut] ?? statut;
  }

  formatSuperficie(m2: number): string {
    if (!m2) return '—';
    return m2 >= 10000 ? `${(m2 / 10000).toFixed(4)} ha` : `${m2.toFixed(2)} m²`;
  }

  trackById(_: number, item: Parcelle): string { return item.id; }

  onCancel(): void {
    this.activeModal.dismiss();
  }

  onConfirm(): void { this.activeModal.close('reserved'); }

}
