import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, inject, signal, computed, PLATFORM_ID
} from '@angular/core';
import { CommonModule, DatePipe, isPlatformBrowser } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { 
  NgbModal, 
  NgbPaginationModule, 
  NgbTooltipModule 
} from '@ng-bootstrap/ng-bootstrap';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';

import type { Map as OlMap } from 'ol';
import type { Geometry } from 'ol/geom';
import type OlFeature from 'ol/Feature';
import type VectorSourceType from 'ol/source/Vector';
import type VectorLayerType from 'ol/layer/Vector';

import { ParcelleService } from '../../services/parcelle';
import { LotissementService } from '../../services/lotissement';
import { 
  AdminMapService, 
  ParcelleLightItem 
} from '../../admin/service/admin-map.service';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';
import { RelativeTimePipe } from '../../../../pipe/relative-time.pipe';
import { ParcelleForm } from '../parcelle-form/parcelle-form';
import { ParcelleDetailModal } from '../parcelle-detail/parcelle-detail';
import {
  Parcelle, STATUT_PARCELLE_BADGE,
  STATUT_PARCELLE_LABELS, StatutParcelle
} from '../../models/parcelle.model';
import { Lotissement } from '../../models/lotissement.model';
import { Authentication } from '../../../../auth/core/authentication';

const STATUT_COLORS: Record<string, string> = {
  DISPONIBLE: '#008753',
  ATTRIBUEE:  '#2563EB',
  RESERVEE:   '#F59E0B',
  REFUSEE:    '#EF4444',
};

@Component({
  selector: 'app-parcelle-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    NgbTooltipModule, NgbPaginationModule,
    RelativeTimePipe,
  ],
  templateUrl: './parcelle-list.html',
  styleUrl: './parcelle-list.scss',
  providers: [DatePipe],
})
export class ParcelleList implements OnInit, OnDestroy {

  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  // ── Injections ────────────────────────────────────────────
  private platformId   = inject(PLATFORM_ID);
  private route        = inject(ActivatedRoute);
  private router       = inject(Router);
  private modal        = inject(NgbModal);
  private datePipe     = inject(DatePipe);

  private auth         = inject(Authentication);
  private svc          = inject(ParcelleService);
  private lotSvc       = inject(LotissementService);
  private sam          = inject(AdminMapService);
  private confirmation = inject(ConfirmationService);

  // ── État général ──────────────────────────────────────────
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

  hasPermission = computed(() => this.auth.hasAnyRole(['Admin', 'Manager', 'Vendor']));

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

  // ── OL — uniquement des types, jamais d'instances au niveau classe ─
  // Toutes les instances OL sont créées dans initMap() après isPlatformBrowser.
  private map!:          OlMap;
  private vectorSource!: VectorSourceType<OlFeature<Geometry>>;
  private vectorLayer!:  VectorLayerType;
  private geoJsonParser: any = null;  // instance GeoJSON stockée après initMap()

  private destroy$ = new Subject<void>();
  private search$  = new Subject<string>();

  // ── Lifecycle ─────────────────────────────────────────────
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
    this.map?.setTarget(undefined as any);
  }

  // ── Chargement ────────────────────────────────────────────
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
          this.parcelles.set(res); this.total.set(res.length); 
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
        if (this.map) this.refreshMapFeatures();
      },
      error: err => {
        if (err.status === 403) {
          this.error.set(err.status === 403
          ? 'Accès refusé pour la vue carte.'
          : err.error?.detail ?? 'Erreur chargement carte.');
          
          this.router.navigate(['/lango/unauthorized'], {
            state: { previousUrl: this.router.url }
          });
        }
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

  // ── Toggle vue ────────────────────────────────────────────
  switchView(v: 'table' | 'map'): void {
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

  // ── OpenLayers — imports dynamiques (fix définitif NG0400) ───
  private async initMap(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.mapContainer?.nativeElement) return;

    if (this.map) {
      this.map.setTarget(undefined as any);
      this.map = undefined!;
    }

    // Imports dynamiques : chargés UNIQUEMENT dans le navigateur,
    // jamais pendant le rendu SSR → NG0400 impossible.
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

  // ── Actions CRUD ──────────────────────────────────────────
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
          context: 'create', 
          title: 'Parcelle créée', 
          type: 'bg-success', 
          closeLabel: 'Ok', 
          message: 'La parcelle a été créée avec succès.' 
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
          context: 'update', 
          title: 'Parcelle modifiée', 
          message: 'La parcelle a été modifiée avec succès.', 
          type: 'bg-info', 
          closeLabel: 'Ok' 
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
      next: () => this.loadAll(), 
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
      zonePhraseOne: `Nom : ${p.nom}`, zonePhraseTwo: `Numéro : ${p.numero}`,
      zonePhraseThree: `Créée le : ${formattedDate}`,
      requireMotif: true, motifMinLength: 10, size: 'lg',
    });
    if (!confirmed) return;
    const motif = typeof confirmed === 'string' ? confirmed : 'Suppression demandée';
    this.svc.delete(p.id, motif).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { 
        this.loadAll(); 
        this.confirmation.inform({ 
          context: 'delete', 
          title: 'Parcelle supprimée', 
          message: `"${p.nom}" a été supprimée définitivement.`, 
          type: 'bg-danger', 
          closeLabel: 'Ok' }); 
        },
      error: err => this.error.set(err?.error?.detail ?? 'Suppression impossible.'),
    });
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
}