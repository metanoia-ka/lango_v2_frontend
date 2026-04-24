import { CommonModule } from '@angular/common';
import { 
  Component, computed, inject, Input, OnDestroy, OnInit, signal 
} from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CoordinateSystem, Lotissement } from '../../models/lotissement.model';
import { LotissementService } from '../../services/lotissement';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { TitreFoncierService } from '../../services/titre-foncier';
import { TitreFoncier } from '../../models/titre-foncier.model';
import { CoordinateSystemService } from '../../services/coordinate-system';
import { LotissementImportService } from '../../services/lotissement-import';
import { 
  BorneImportee, 
  FormatFichier, 
  FORMATS_IMPORT, 
  ParseResult 
} from '../../models/lotissement-import.model';
import { ZoneGeoService } from '../../services/zone-geo';
import { VilleService } from '../../services/ville-service';
import { LieuDit, Quartier, TarifResponse } from '../../models/zone-tarifaire.model';

type Mode = 'choix' | 'simple' | 'manual' | 'fichier';

@Component({
  selector: 'app-lotissement-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './lotissement-form.html',
  styleUrl: './lotissement-form.scss'
})
export class LotissementForm implements OnInit, OnDestroy {

  @Input() lotissement?: Lotissement;

  private readonly fb = inject(FormBuilder);
  readonly activeModal = inject(NgbActiveModal);
  private readonly destroy$ = new Subject<void>();

  private readonly svc = inject(LotissementService);
  private importSvc  = inject(LotissementImportService);
  private readonly tfSvc = inject(TitreFoncierService);
  private readonly csSvc = inject(CoordinateSystemService);

  private geoSvc         = inject(ZoneGeoService);
  private villeSvc       = inject(VilleService);

  // ── Données de cascade ────────────────────────────────────────────────────
  villes         = this.villeSvc.villesAvecArrondissements;
  arrondissements = signal<any[]>([]);
  quartiers      = signal<Quartier[]>([]);
  lieuxDits      = signal<LieuDit[]>([]);

  // ── État chargement ───────────────────────────────────────────────────────
  loadingQ  = signal(false);   // quartiers
  loadingLD = signal(false);   // lieux-dits
  loadingT  = signal(false);   // tarif

  // ── Tarif calculé ─────────────────────────────────────────────────────────
  tarif           = signal<TarifResponse | null>(null);
  tarifErreur     = signal('');

  readonly TYPES_IMMEUBLE = [
    { 
      val: 'NON_BATI', 
      label: 'Immeuble non bâti (terrain nu)', 
      icone: 'bi-map' 
    },
    { 
      val: 'BATI', 
      label: 'Immeuble bâti (construction existante)', 
      icone: 'bi-building' 
    },
  ];

  mode            = signal<Mode>('choix');
  saving          = signal(false);
  error           = signal('');
  loading         = signal(false);
  fieldErrors     = signal<Record<string, string>>({});

  titresFonciers = signal<TitreFoncier[]>([]);
  systems = signal<CoordinateSystem[]>([]);

  // ── Import fichier ────────────────────────────────────────────────────────
  readonly FORMATS          = FORMATS_IMPORT;
  formatSelectionne         = signal<FormatFichier | null>(null);
  fichierSelectionne        = signal<File | null>(null);
  parseLoading              = signal(false);
  parseResult               = signal<ParseResult | null>(null);
  parseError                = signal('');
  bornesImportees           = signal<BorneImportee[]>([]);
  sridDetecte               = signal<number | null>(null);
  sridAuto                  = signal(false);

  form = this.fb.group({
    nom:                           ['', [Validators.required, Validators.maxLength(255)]],
    localisation:                  ['', [Validators.required, Validators.maxLength(50)]],
    systeme:                       ['', Validators.required],
    titre_foncier:                 ['', Validators.required],
    date_creation_administrative:  [''],
    bornes: this.fb.array([]),

    // ── Cascade géographique ──────────────────────────────────────────────
    ville:              ['', Validators.required],
    arrondissement_id:  ['', Validators.required],
    quartier_id:        ['', Validators.required],
    lieu_dit_id:        ['', Validators.required],

    // ── Type d'immeuble ───────────────────────────────────────────────────
    type_immeuble:      ['NON_BATI', Validators.required],

    // ── Valeur fiscale (READ-ONLY — remplie automatiquement) ──────────────
    valeur_m2_calculee: [{ value: null as number | null, disabled: true }],
    classification:     [{ value: '',                    disabled: true }],
  });

  isEdit      = computed(() => !!this.lotissement);
  get bornes(): FormArray { return this.form.get('bornes') as FormArray; }

  resumeImport = computed(() => {
    const r = this.parseResult();
    if (!r) return null;
    return {
      nb:      r.nb_bornes,
      srid:    r.srid_detecte,
      avert:   r.avertissements,
      hasMeta: Object.keys(r.meta).length > 0,
    };
  });

  ngOnInit(): void {
    this.loadTitreFoncier();
    this.loadSystems();

    this._setupCascadeVille();
    this._setupCascadeArrondissement();
    this._setupCascadeQuartier();
    this._setupCascadeLieuDit();
    this._setupAutoTarif();

    // Pré-remplir en édition
    if (this.lotissement) this.form.patchValue(this.lotissement);

    // Charger les villes si pas encore chargé
    if (!this.villeSvc.isLoaded()) {
      this.villeSvc.chargerSiNecessaire().pipe(takeUntil(this.destroy$)).subscribe();
    }

    if (this.lotissement) {
      this.mode.set('manual');
      this.form.patchValue({
        nom:                          this.lotissement.nom,
        localisation:                 this.lotissement.localisation,
        systeme:                      this.lotissement.systeme,
        titre_foncier:                this.lotissement.titre_foncier,
        date_creation_administrative: this.lotissement.date_creation_administrative ?? '',
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // LieuDit disponible pour le type d'immeuble sélectionné
  lieuDitCompatible(ld: LieuDit): boolean {
    const type = this.form.get('type_immeuble')?.value;
    if (type === 'NON_BATI') return ld.a_tarif_non_bati;
    if (type === 'BATI')     return ld.a_tarif_bati;
    return true;
  }

  // ── Cascades ──────────────────────────────────────────────────────────────

  private _setupCascadeVille(): void {
    this.form.get('ville')!.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(ville => {
        this.form.patchValue({ arrondissement_id: '', quartier_id: '', lieu_dit_id: '' });
        this.quartiers.set([]);
        this.lieuxDits.set([]);
        this._clearTarif();

        if (!ville) {
          this.arrondissements.set([]);
          return;
        }
        const v = this.villes().find(v => v.ville === ville);
        this.arrondissements.set(v?.arrondissements ?? []);
      });
  }

  private _setupCascadeArrondissement(): void {
    this.form.get('arrondissement_id')!.valueChanges.pipe(
      takeUntil(this.destroy$),
      switchMap(arrId => {
        this.form.patchValue({ quartier_id: '', lieu_dit_id: '' });
        this.lieuxDits.set([]);
        this._clearTarif();
        if (!arrId) { this.quartiers.set([]); return []; }
        this.loadingQ.set(true);
        return this.geoSvc.getQuartiers(arrId);
      })
    ).subscribe({
      next:  q  => { this.quartiers.set(q); this.loadingQ.set(false); },
      error: () => this.loadingQ.set(false),
    });
  }

  private _setupCascadeQuartier(): void {
    this.form.get('quartier_id')!.valueChanges.pipe(
      takeUntil(this.destroy$),
      switchMap(qId => {
        this.form.patchValue({ lieu_dit_id: '' });
        this._clearTarif();
        if (!qId) { this.lieuxDits.set([]); return []; }
        this.loadingLD.set(true);
        return this.geoSvc.getLieuxDits(qId);
      })
    ).subscribe({
      next:  ld => { this.lieuxDits.set(ld); this.loadingLD.set(false); },
      error: () => this.loadingLD.set(false),
    });
  }

  private _setupCascadeLieuDit(): void {
    // Déclencher le calcul du tarif quand lieu_dit OU type_immeuble change
    this.form.get('lieu_dit_id')!.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this._calculerTarif());

    this.form.get('type_immeuble')!.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this._calculerTarif());
  }

  private _setupAutoTarif(): void {
    // Déjà géré dans _setupCascadeLieuDit
  }

  private _calculerTarif(): void {
    const lieuDitId   = this.form.get('lieu_dit_id')?.value;
    const typeImm     = this.form.get('type_immeuble')?.value as 'NON_BATI' | 'BATI';

    if (!lieuDitId || !typeImm) { this._clearTarif(); return; }

    this.loadingT.set(true);
    this.tarifErreur.set('');

    this.geoSvc.getTarif(lieuDitId, typeImm).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (t) => {
          this.loadingT.set(false);
          if (t.tarif_disponible) {
            this.tarif.set(t);
            this.form.patchValue({
              valeur_m2_calculee: t.valeur_m2 ?? null,
              classification:     t.classification ?? '',
            });
            this.tarifErreur.set('');
          } else {
            this._clearTarif();
            this.tarifErreur.set(t.detail ?? 'Tarif non disponible pour ce lieu-dit.');
          }
        },
        error: () => {
          this.loadingT.set(false);
          this._clearTarif();
          this.tarifErreur.set('Erreur lors de la récupération du tarif.');
        }
      });
  }

  private _clearTarif(): void {
    this.tarif.set(null);
    this.tarifErreur.set('');
    this.form.patchValue({ valeur_m2_calculee: null, classification: '' });
  }

  choisirMode(m: Mode): void {
    this.mode.set(m);
    this.error.set('');
    this.parseError.set('');
  }

  retourChoix(): void {
    this.mode.set('choix');
    this.formatSelectionne.set(null);
    this.fichierSelectionne.set(null);
    this.parseResult.set(null);
    this.parseError.set('');
    this.bornesImportees.set([]);
    this.sridDetecte.set(null);
    this.sridAuto.set(false);
    this.form.get('systeme')?.enable();
  }

  // ── Sélection format ──────────────────────────────────────────────────────
  selectionnerFormat(fmt: FormatFichier): void {
    this.formatSelectionne.set(fmt);
    this.fichierSelectionne.set(null);
    this.parseResult.set(null);
    this.parseError.set('');
  }

  // ── Sélection fichier ─────────────────────────────────────────────────────
  onFichierChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0] ?? null;
    this.fichierSelectionne.set(file);
    this.parseResult.set(null);
    this.parseError.set('');
    this.bornesImportees.set([]);
    if (file) this.parserFichier(file);
  }

  // ── Parsing (étape 1 : appel API preview) ─────────────────────────────────
  parserFichier(file: File): void {
    this.parseLoading.set(true);
    this.parseError.set('');

    this.importSvc.parserFichier(file).subscribe({
      next: (result) => {
        this.parseResult.set(result);
        this.bornesImportees.set(result.bornes);
        this.parseLoading.set(false);

        // Si le SRID est détecté automatiquement
        if (result.srid_detecte) {
          this.sridDetecte.set(result.srid_detecte);
          // Trouver le CoordinateSystem correspondant dans la liste
          const cs = this.systems().find(s => s.srid === result.srid_detecte);
          if (cs) {
            this.form.get('systeme')?.setValue(cs.id);
            this.form.get('systeme')?.disable();
            this.sridAuto.set(true);
          } else {
            this.parseError.set(
              `SRID détecté : ${result.srid_detecte} — ` +
              `introuvable dans la liste. Sélectionnez manuellement.`
            );
          }
        } else {
          // SRID inconnu → laisser l'utilisateur choisir
          this.form.get('systeme')?.enable();
          this.sridAuto.set(false);
        }
      },
      error: (err) => {
        this.parseLoading.set(false);
        this.parseError.set(
          err.status === 422
            ? err.error?.detail
            : err.status === 501
              ? `Dépendance manquante côté serveur : ${err.error?.detail}`
              : `Erreur : ${err.error?.detail ?? err.message}`
        );
      }
    });
  }

  // ── Soumission — mode manual ──────────────────────────────────────────────
  submitManuel(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.error.set('');

    const raw         = this.form.value;
    const bornesData  = (raw.bornes ?? []).map((b: any) => ({
      point: [parseFloat(b.x), parseFloat(b.y)] as [number, number],
    }));

    const payload: any = {
      nom:                          raw.nom,
      localisation:                 raw.localisation,
      systeme:                      raw.systeme,
      titre_foncier:                raw.titre_foncier,
      date_creation_administrative: raw.date_creation_administrative || undefined,
    };

    const obs$ = this.isEdit()
      ? this.svc.update(this.lotissement!.id, payload)
      : this.svc.create(payload);

    obs$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (lot) => {
        if (!this.isEdit() && bornesData.length >= 4) {
          this.svc.addBornes(lot.id, bornesData)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next:  () => { 
                this.saving.set(false); 
                this.activeModal.close('saved'); 
              },
              error: (e) => { 
                this.saving.set(false); 
                this.error.set(e.error?.detail ?? 'Erreur ajout bornes.'); 
              }
            });
        } else {
          this.saving.set(false);
          this.activeModal.close('saved');
        }
      },
      error: (err) => {
        this.saving.set(false);
        this._handleApiErrors(err);
      }
    });
  }

  // ── Soumission — mode fichier (étape 2 : confirmer) ───────────────────────
  submitFichier(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.bornesImportees().length < 4) {
      this.error.set('Minimum 4 bornes requises.');
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const raw = this.form.getRawValue();  // getRawValue → inclut les champs disabled

    this.importSvc.confirmerImport({
      nom:                          raw.nom!,
      localisation:                 raw.localisation!,
      systeme:                      raw.systeme!,
      titre_foncier:                raw.titre_foncier!,
      date_creation_administrative: raw.date_creation_administrative || undefined,
      bornes:                       this.bornesImportees(),
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.saving.set(false);
        this.activeModal.close({
          action:         'saved',
          lotissement:    result.lotissement,
          geom_generee:   result.geom_generee,
          avertissements: result.avertissements,
        });
      },
      error: (err) => {
        this.saving.set(false);
        this._handleApiErrors(err);
      }
    });
  }

  // ── submit() générique appelé depuis le template ──────────────────────────
  submit(): void {
    const m = this.mode();
    if (m === 'fichier') this.submitFichier();
    else                 this.submitManuel();
  }

  // ── Bornes manuelles ──────────────────────────────────────────────────────
  addBorne(): void {
    this.bornes.push(this.fb.group({
      x: ['', [Validators.required, Validators.pattern(/^-?\d+(\.\d+)?$/)]],
      y: ['', [Validators.required, Validators.pattern(/^-?\d+(\.\d+)?$/)]],
    }));
  }

  removeBorne(i: number): void { this.bornes.removeAt(i); }

  // ── Données de référence ──────────────────────────────────────────────────
  private loadTitreFoncier(): void {
    this.tfSvc.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next:  (tf) => this.titresFonciers.set(tf),
      error: ()   => this.error.set('Impossible de charger les titres fonciers.'),
    });
  }

  private loadSystems(): void {
    this.csSvc.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next:  (sc) => this.systems.set(sc),
      error: ()   => this.error.set('Impossible de charger les systèmes de coordonnées.'),
    });
  }

  // ── Utilitaires ───────────────────────────────────────────────────────────
  private _handleApiErrors(err: any): void {
    if (err.error && typeof err.error === 'object') {
      const errs: Record<string, string> = {};
      Object.keys(err.error).forEach(k => {
        errs[k] = Array.isArray(err.error[k]) ? err.error[k][0] : err.error[k];
      });
      this.fieldErrors.set(errs);
    } else {
      this.error.set('Une erreur est survenue. Veuillez réessayer.');
    }
  }

  formatValeur(v: number | null | undefined): string {
    if (!v) return '—';
    return v.toLocaleString('fr-FR') + ' FCFA/m²';
  }

  getFieldError(field: string): string {
    const ctrl = this.form.get(field);
    if (ctrl?.touched && ctrl.hasError('required'))   return 'Ce champ est obligatoire.';
    if (ctrl?.touched && ctrl.hasError('maxlength'))  return 'Valeur trop longue.';
    return this.fieldErrors()[field] ?? '';
  }
}
