import { CommonModule } from '@angular/common';
import { 
  Component, 
  computed, 
  inject, 
  Input, 
  OnDestroy, 
  OnInit, 
  signal 
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, switchMap, takeUntil } from 'rxjs';
import { 
  BienImmobilier, 
  TRANSACTION_LABELS,
  TypeTransaction 
} from '../../models/bien-type-immobilier.model';
import { BienImmobilierService } from '../../services/bien-immobilier';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { 
  Arrondissement, 
  RegionAvecDepartements } from '../../models/titre-foncier.model';
import { TitreFoncierService } from '../../services/titre-foncier';
import { ParcelleService } from '../../services/parcelle';
import { Router } from '@angular/router';
import { 
  CategorieBienAvecTypes, 
  RegionComplete, 
  TRANSACTION_DESCRIPTIONS, 
  TRANSACTION_ICONES, 
  TypeBienImmobilier 
} from '../../models/categorie-type-bien-immobilier.model';
import { TypeBienService } from '../../services/categorie-type-bien-immobilier';

const MAX_FILE_SIZE  = 1.5 * 1024 * 1024;
const ALLOWED_TYPES  = ['image/jpeg', 'image/png', 'image/webp'];

@Component({
  selector: 'app-bien-immobilier-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './bien-immobilier-form.html',
  styleUrl: './bien-immobilier-form.scss'
})
export class BienImmobilierForm implements OnInit, OnDestroy {

  @Input() bien?: BienImmobilier;

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  
  private readonly svc = inject(BienImmobilierService);
  private readonly typeSvc = inject(TypeBienService);
  private readonly titreSvc = inject(TitreFoncierService);
  private readonly parcelleSvc = inject(ParcelleService);
  readonly activeModal = inject(NgbActiveModal);
  private readonly destroy$ = new Subject<void>();

  saving        = signal(false);
  error         = signal('');
  fieldErrors   = signal<Record<string, string>>({});
  photoFiles    = signal<File[]>([]);
  photoPreviews = signal<string[]>([]);
  photoError    = signal('');

  // Catégories + types (cascade)
  categoriesAvecTypes = signal<CategorieBienAvecTypes[]>([]);
  typesFiltres        = signal<TypeBienImmobilier[]>([]);
  loadingTypes        = signal(false);

  // Arrondissements (cascade région → dept → arr)
  regions            = signal<RegionComplete[]>([]);
  arrondissements    = signal<Arrondissement[]>([]);
  loadingArrs        = signal(false);

  // Titres fonciers / parcelles
  titresFoncier = signal<any[]>([]);
  parcelles     = signal<any[]>([]);
  loadingTitres = signal(false);
  loadingParc   = signal(false);

  readonly TRANSACTION_LABELS       = TRANSACTION_LABELS;
  readonly TRANSACTION_DESCRIPTIONS = TRANSACTION_DESCRIPTIONS;
  readonly TRANSACTION_ICONES       = TRANSACTION_ICONES;
  readonly txKeys = ['VENTE', 'LOCATION', 'LOCATION_VENTE'] as TypeTransaction[];

  form = this.fb.group({
    // Catégorie d'abord → filtre les types
    categorie_bien:       [''],
    type_bien:            ['', Validators.required],
    type_transaction:     ['VENTE' as TypeTransaction, Validators.required],
    // Localisation
    localisation_approx:  ['', [Validators.required, Validators.maxLength(255)]],
    arrondissement:       ['', Validators.required],               // ← NOUVEAU
    superficie:           [null as number | null],
    description:          ['', Validators.required],
    zone_tarifaire:       [null as string | null],
    // Parcelle (cascade)
    titre_foncier_id:     [null as string | null],
    parcelle:             [null as string | null],
    // Prix selon transaction
    prix_m2:              [null as number | null],
    loyer_mensuel:        [null as number | null],
    duree_bail_min_mois:  [null as number | null],
    caution_mois:         [null as number | null],
  });

  // ── Getters helpers ───────────────────────────────────────────────────────
  get isEdit()         { return !!this.bien; }
  get txValue()        {
    return this.form.get('type_transaction')?.value as TypeTransaction; 
  }
  get isVente()        { return this.txValue === 'VENTE'; }
  get isLocation()     { return this.txValue === 'LOCATION'; }
  get isLocationVente(){ return this.txValue === 'LOCATION_VENTE'; }

  // Type sélectionné — pour décider si parcelle est requise
  typeBienSelectionne = computed(() => {
    const id = this.form.get('type_bien')?.value;
    return this.typesFiltres().find(t => t.id === id)
      ?? this.categoriesAvecTypes().flatMap(c => c.types).find(t => t.id === id)
      ?? null;
  });
  get needsParcelle() { return this.typeBienSelectionne()?.necessite_parcelle ?? false; }


  ngOnInit(): void {
    // ── Charger catégories + tous les types ──────────────────────────────
    this._setupCascadeCategorie();

    // ── Charger régions → arrondissements ────────────────────────────────
    this._setupCascadeLocalisation();

    // ── Titres fonciers ── Cascade TF → parcelles ─────────────────────────
    this._setupCascadeParcelle();

    // ── Pré-remplir en édition ────────────────────────────────────────────
    this._patchForm();
  }

  private _setupCascadeLocalisation(): void {
    this.loadingArrs.set(true);
    this.titreSvc.getRegionsAvecDepartements().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next:  r => { this.regions.set(r as any); this.loadingArrs.set(false); },
      error: () => this.loadingArrs.set(false),
    });
  }

  private _setupCascadeCategorie(): void {
    this.loadingTypes.set(true);
    this.typeSvc.getCategoriesAvecTypes().pipe(
      takeUntil(this.destroy$)
    ).subscribe(cats => {
      this.categoriesAvecTypes.set(cats);
      // Si pas de catégorie sélectionnée, afficher tous les types actifs
      const tous = cats.flatMap(c => c.types.filter(t => t.est_actif));
      this.typesFiltres.set(tous);
      this.loadingTypes.set(false);
    });

    // ── Réaction au changement de catégorie ──────────────────────────────
    this.form.get('categorie_bien')!.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(catId => {
      this.form.patchValue({ type_bien: '' });
      if (!catId) {
        const tous = this.categoriesAvecTypes().flatMap(
          c => c.types.filter(t => t.est_actif)
        );
        this.typesFiltres.set(tous);
      } else {
        const cat = this.categoriesAvecTypes().find(c => c.id === catId);
        this.typesFiltres.set(cat?.types.filter(t => t.est_actif) ?? []);
      }
    });
  }

  private _setupCascadeParcelle(): void {
    this.loadingTitres.set(true);
    this.titreSvc.getMesTitres().pipe(takeUntil(this.destroy$)).subscribe({
      next:  t => { this.titresFoncier.set(t); this.loadingTitres.set(false); },
      error: () => this.loadingTitres.set(false),
    });

    this.form.get('titre_foncier_id')!.valueChanges.pipe(
      takeUntil(this.destroy$),
      switchMap(tfId => {
        this.parcelles.set([]);
        this.form.patchValue({ parcelle: null });
        if (!tfId) return [];
        this.loadingParc.set(true);
        return this.parcelleSvc.getByTitreFoncier(tfId);
      })
    ).subscribe({
      next:  p => { this.parcelles.set(p); this.loadingParc.set(false); },
      error: () => this.loadingParc.set(false),
    });
  }

  private _patchForm(): void {
    if (this.bien) {
      const b = this.bien;
      // Trouver la catégorie du type sélectionné
      const typeCatId = this.categoriesAvecTypes()
        .find(c => c.types.some(t => t.id === b.type_bien))?.id ?? '';

      this.form.patchValue({
        categorie_bien:      typeCatId,
        type_bien:           b.type_bien,
        type_transaction:    b.type_transaction,
        localisation_approx: b.localisation_approx,
        arrondissement:      b.arrondissement ?? null,
        superficie:          b.superficie ? parseFloat(b.superficie) : null,
        description:         b.description,
        zone_tarifaire:      b.zone_tarifaire,
        parcelle:            b.parcelle,
        prix_m2:      b.prix_m2      ? parseFloat(b.prix_m2) : null,
        loyer_mensuel:b.loyer_mensuel? parseFloat(b.loyer_mensuel) : null,
        duree_bail_min_mois: b.duree_bail_min_mois,
        caution_mois:        b.caution_mois,
      });
    }
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  // Arrondissements aplatis depuis les régions
  get tousArrondissements(): Arrondissement[] {
    return this.regions().flatMap((r: any) =>
      r.departements.flatMap((d: any) =>
        (d.arrondissements ?? []).map((a: any) => ({
          ...a,
          departement_nom: d.nom,
          region_nom:      r.nom,
        }))
      )
    );
  }

  goToTitresFonciers(): void {
    this.activeModal.dismiss();
    this.router.navigateByUrl('/lango/titres-fonciers');
  }

  onPhotoSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    const files = Array.from(input.files);
    const totalAfter = this.photoFiles().length + files.length;
    if (totalAfter > 10) {
      this.photoError.set('Maximum 10 photos par bien.');
      return;
    }
    for (const f of files) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        this.photoError.set('Format accepté : JPG, PNG, WEBP.');
        return;
      }
      if (f.size > MAX_FILE_SIZE) {
        this.photoError.set('Chaque photo doit faire moins de 1,5 Mo.');
        return;
      }
    }
    this.photoError.set('');
    this.photoFiles.set([...this.photoFiles(), ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.photoPreviews.set([...this.photoPreviews(), e.target.result]);
      };
      reader.readAsDataURL(f);
    });
    input.value = '';
  }

  removePhoto(index: number): void {
    this.photoFiles.set(this.photoFiles().filter((_, i) => i !== index));
    this.photoPreviews.set(this.photoPreviews().filter((_, i) => i !== index));
  }

  getFieldError(field: string): string {
    const ctrl = this.form.get(field);
    if (ctrl?.touched && ctrl.hasError('required'))  return 'Ce champ est obligatoire.';
    if (ctrl?.touched && ctrl.hasError('maxlength')) return 'Valeur trop longue.';
    if (ctrl?.touched && ctrl.hasError('min'))       return 'La valeur doit être positive.';
    return this.fieldErrors()[field] ?? '';
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.error.set('');
    this.fieldErrors.set({});

    const raw = this.form.value;
    const payload: any = {
      type_bien:           raw.type_bien,
      type_transaction:    raw.type_transaction,
      localisation_approx: raw.localisation_approx,
      description:         raw.description,
    };
    if (raw.arrondissement) 
      payload['arrondissement'] = raw.arrondissement;
    if (raw.superficie) 
      payload['superficie'] = raw.superficie;
    if (raw.zone_tarifaire) 
      payload['zone_tarifaire'] = raw.zone_tarifaire;
    if (raw.parcelle) 
      payload['parcelle'] = raw.parcelle;

    if (this.isVente && raw.prix_m2)
      payload['prix_m2'] = raw.prix_m2;
    if ((this.isLocation || this.isLocationVente) && raw.loyer_mensuel) {
      payload['loyer_mensuel']       = raw.loyer_mensuel;
      payload['duree_bail_min_mois'] = raw.duree_bail_min_mois;
      payload['caution_mois']        = raw.caution_mois;
    }
    if (this.isLocationVente && raw.prix_m2)
      payload['prix_m2'] = raw.prix_m2;
    if (this.photoFiles().length)
      payload['nouvelles_photos'] = this.photoFiles();

    const obs$ = this.isEdit
      ? this.svc.update(this.bien!.id, payload)
      : this.svc.create(payload);

    obs$.pipe(takeUntil(this.destroy$)).subscribe({
      next:  () => this.activeModal.close('saved'),
      error: err => {
        this.saving.set(false);
        if (err.error && typeof err.error === 'object') {
          const errs: Record<string, string> = {};
          Object.keys(err.error).forEach(k => {
            errs[k] = Array.isArray(err.error[k]) ? err.error[k][0] : String(err.error[k]);
          });
          this.fieldErrors.set(errs);
        } else {
          this.error.set('Une erreur est survenue.');
        }
      },
    });
  }
}
