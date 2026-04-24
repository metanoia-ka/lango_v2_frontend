import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { 
  DisponibilitePayload, 
  EquipementPayload, EspaceEvenementielDetail, 
  PhotoEspace, PhotoUploadPayload, TarifPayload, 
  TypeEspace, UniteLocation } from '../models/espace-evenementiel.model';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { 
  AbstractControl, FormArray, 
  FormBuilder, FormGroup, 
  ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { EspaceEvenementielService } from '../services/espace-evenementiel';
import { Subject, takeUntil } from 'rxjs';
import { TitreFoncierService } from '../../foncier/services/titre-foncier';
import { Arrondissement, Departement } from '../../foncier/models/titre-foncier.model';
import { LieuDit, Quartier } from '../../foncier/models/zone-tarifaire.model';
import { ZoneGeoService } from '../../foncier/services/zone-geo';

// ── Interface interne pour la gestion des photos dans le formulaire ───────────
 
interface PhotoPreview {
  /** Fichier local sélectionné — null si la photo vient du serveur */
  file: File | null;
  /** Object URL (createObjectURL) ou URL absolue serveur */
  previewUrl: string;
  legende: string;
  /** Position souhaitée dans la galerie (envoyée lors de l'upload) */
  ordre: number;
  uploading: boolean;
  uploadError: string | null;
  /** Présent uniquement après upload réussi ou chargement en mode édition */
  uploaded: PhotoEspace | null;
}
 
// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-espace-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './espace-form.html',
  styleUrl: './espace-form.scss'
})
export class EspaceForm implements OnInit, OnDestroy {

  private readonly fb       = inject(FormBuilder);
  private readonly route    = inject(ActivatedRoute);
  private readonly router   = inject(Router);
  private readonly destroy$ = new Subject<void>();

  private readonly svc      = inject(EspaceEvenementielService);
  private readonly tfSvc    = inject(TitreFoncierService);
  private readonly zoneSvc  = inject(ZoneGeoService)
 
  // ── State global ──────────────────────────────────────────────────────────
  espaceId    = signal<string | null>(null);
  isEdit      = signal(false);
  loading     = signal(false);
  stepSaving  = signal(false);
  globalError = signal<string | null>(null);
  stepErrors  = signal<Record<number, string | null>>({});
  activeStep  = signal(0);

  // ── États géographiques ────────────────────────────────────────────────
  regions         = this.tfSvc.regions;  // signal existant dans le service
  departements    = signal<Departement[]>([]);
  arrondissements = signal<Arrondissement[]>([]);
  quartiers       = signal<Quartier[]>([]);
  lieuxDits       = signal<LieuDit[]>([]);
 
  // ── Définition des étapes ─────────────────────────────────────────────────
  readonly STEPS = [
    { label: 'Informations',   icon: 'bi-building'      },
    { label: 'Capacité',       icon: 'bi-people'        },
    { label: 'Tarifs',         icon: 'bi-cash-stack'    },
    { label: 'Équipements',    icon: 'bi-tools'         },
    { label: 'Disponibilités', icon: 'bi-calendar-week' },
    { label: 'Photos',         icon: 'bi-images'        },
  ];
 
  // ── Options ───────────────────────────────────────────────────────────────
  readonly typeOptions: { value: TypeEspace; label: string; icon: string }[] = [
    { 
      value: 'SALLE_FETES', 
      label: 'Salle des fêtes', 
      icon: 'bi-balloon-heart' 
    },
    { 
      value: 'SALLE_CONFERENCE', 
      label: 'Salle de conférences', 
      icon: 'bi-easel' 
    },
    { 
      value: 'SALLE_MARIAGE',  
      label: 'Mariage / réception', 
      icon: 'bi-heart' 
    },
    { 
      value: 'SALLE_REUNION', 
      label: 'Réunion / coworking', 
      icon: 'bi-people-fill' 
    },
    { value: 'PLEIN_AIR', 
      label: 'Plein air / jardin', 
      icon: 'bi-tree'
    },
    { 
      value: 'RESTAURANT',  
      label: 'Restaurant privatisable', 
      icon: 'bi-cup-hot' 
    },
    { 
      value: 'STUDIO', 
      label: 'Studio photo / vidéo', 
      icon: 'bi-camera' 
    },
    { 
      value: 'TERRAIN_SPORT', 
      label: 'Terrain de sport', 
      icon: 'bi-trophy' 
    },
    { 
      value: 'AUTRE', 
      label: 'Autre espace', 
      icon: 'bi-three-dots' 
    },
  ];
 
  readonly uniteOptions: { value: UniteLocation; label: string }[] = [
    { value: 'HEURE',   label: "À l'heure"         },
    { value: 'DEMI_J',  label: 'À la demi-journée' },
    { value: 'JOURNEE', label: 'À la journée'       },
    { value: 'WEEKEND', label: 'Au week-end'         },
    { value: 'SEMAINE', label: 'À la semaine'        },
    { value: 'MOIS',    label: 'Au mois'             },
  ];
 
  readonly iconeOptions: { value: string; label: string }[] = [
    { value: 'bi-wifi',              label: 'WiFi'          },
    { value: 'bi-snow',              label: 'Climatisation' },
    { value: 'bi-music-note-beamed', label: 'Sono / DJ'     },
    { value: 'bi-projector',         label: 'Projecteur'    },
    { value: 'bi-p-circle',          label: 'Parking'       },
    { value: 'bi-cup-straw',         label: 'Traiteur'      },
    { value: 'bi-camera-video',      label: 'Caméra'        },
    { value: 'bi-lightning-charge',  label: 'Groupe élec.'  },
    { value: 'bi-door-open',         label: 'Vestiaire'     },
    { value: 'bi-check-circle',      label: 'Autre'         },
  ];
 
  readonly motifOptions = [
    { value: 'BLOQUE',    label: 'Bloqué par moi'        },
    { value: 'ENTRETIEN', label: 'Entretien / nettoyage' },
  ];
 
  // ── Formulaires réactifs ──────────────────────────────────────────────────
  infoForm!:     FormGroup;
  capaciteForm!: FormGroup;
  tarifsForm!:   FormGroup;
  equipForm!:    FormGroup;
  dispoForm!:    FormGroup;
 
  // ── Gestion des photos (hors ReactiveForms — multipart) ───────────────────
  photos        = signal<PhotoPreview[]>([]);
  photosDragOver= signal(false);
  /** Nombre max de photos autorisées */
  readonly MAX_PHOTOS = 10;
 
  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────
 
  ngOnInit(): void {
    this.buildForms();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.espaceId.set(id);
      this.isEdit.set(true);
      this.loadForEdit(id);
    }

    // Charger les régions si pas encore chargées
    if (!this.regions().length) {
      this.tfSvc.getRegionsAvecDepartements().pipe(
        takeUntil(this.destroy$)
      ).subscribe();
    }
  }

  /** Sélection d'une région → met à jour la liste des départements */
  onRegionChange(regionId: string): void {
    // Réinitialiser les sélections suivantes
    this.departements.set([]);
    this.arrondissements.set([]);
    this.quartiers.set([]);
    this.lieuxDits.set([]);

    const region = this.regions().find(r => r.id === regionId);
    if (region) {
      this.departements.set(region.departements);
    }
  }

  /** Sélection d'un département → charge les arrondissements + met à jour l'abréviation */
  onDepartementChange(departementId: string): void {
    this.arrondissements.set([]);
    this.quartiers.set([]);
    this.lieuxDits.set([]);

    if (departementId) {
      this.tfSvc.getArrondissements(departementId)
        .pipe(takeUntil(this.destroy$))
        .subscribe(arrs => this.arrondissements.set(arrs));
    }
  }

  /** Sélection d'un arrondissement → charge les quartiers */
  onArrondissementChange(arrondissementId: string): void {
    this.quartiers.set([]);
    this.lieuxDits.set([]);

    if (arrondissementId) {
      this.zoneSvc.getQuartiers(arrondissementId)
        .pipe(takeUntil(this.destroy$))
        .subscribe(quartiers => this.quartiers.set(quartiers));
    }
  }

  /** Sélection d'un quartier → charge les lieux-dits */
  onQuartierChange(quartierId: string): void {
    this.lieuxDits.set([]);

    if (quartierId) {
      this.zoneSvc.getLieuxDits(quartierId)
        .pipe(takeUntil(this.destroy$))
        .subscribe(lieux => this.lieuxDits.set(lieux));
    }

    this.updateLocalisation();
  }

  /** Sélection d'un lieu-dit → met à jour la localisation */
  onLieuDitChange(_lieuDitId: string): void {
    this.updateLocalisation();
  }

  /** Construit la localisation approximative à partir des sélections */
  private updateLocalisation(): void {
    const arrondissement = this.arrondissements().find(
      a => a.id === this.infoForm.get('arrondissement_id')?.value
    );
    const quartier = this.quartiers().find(
      q => q.id === this.infoForm.get('quartier_id')?.value
    );
    const lieuDit = this.lieuxDits().find(
      ld => ld.id === this.infoForm.get('lieu_dit_id')?.value
    );

    const parts: string[] = [];
    if (lieuDit) parts.push(lieuDit.nom);
    if (quartier) parts.push(quartier.nom);
    if (arrondissement) {
      parts.push(arrondissement.ville_reference || arrondissement.nom);
    }

    const localisation = parts.join(', ');
    if (localisation) {
      this.infoForm.patchValue({ localisation_approx: localisation });
    }
  }
 
  ngOnDestroy(): void {
    // Libérer les Object URLs créées pour les prévisualisations locales
    this.photos().forEach(p => {
      if (p.file && p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    });
    this.destroy$.next();
    this.destroy$.complete();
  }
 
  // ─────────────────────────────────────────────────────────────────────────
  // Construction des formulaires
  // ─────────────────────────────────────────────────────────────────────────
 
  private buildForms(): void {
    this.infoForm = this.fb.group({
      nom:                 ['', [Validators.required, Validators.maxLength(200)]],
      arrondissement_id:   [''],
      type_espace:         ['', Validators.required],
      localisation_approx: ['', [Validators.required, Validators.maxLength(255)]],
      adresse_complete:    [''],
      description:         ['', [Validators.required, Validators.minLength(30)]],
    });
 
    this.capaciteForm = this.fb.group({
      capacite_min:  [1,    [Validators.required, Validators.min(1)]],
      capacite_max:  [null, [Validators.required, Validators.min(1)]],
      superficie_m2: [null],
    }, { validators: this.capaciteValidator });
 
    this.tarifsForm = this.fb.group({
      tarifs: this.fb.array([this.newTarifGroup()])
    });
 
    this.equipForm = this.fb.group({
      equipements: this.fb.array([])
    });
 
    this.dispoForm = this.fb.group({
      disponibilites: this.fb.array([])
    });
  }
 
  // ── Validators ────────────────────────────────────────────────────────────
 
  private capaciteValidator(g: AbstractControl) {
    const min = +g.get('capacite_min')?.value;
    const max = +g.get('capacite_max')?.value;
    return (min && max && min > max) ? { capaciteInvalide: true } : null;
  }
 
  private dispoDateValidator(g: AbstractControl) {
    const debut = g.get('date_debut')?.value;
    const fin   = g.get('date_fin')?.value;
    return (debut && fin && new Date(debut) >= new Date(fin))
      ? { dateInvalide: true }
      : null;
  }
 
  // ─────────────────────────────────────────────────────────────────────────
  // Accesseurs FormArray
  // ─────────────────────────────────────────────────────────────────────────
 
  get tarifsArray(): FormArray { 
    return this.tarifsForm.get('tarifs') as FormArray; 
  }
  get equipArray():  FormArray { 
    return this.equipForm.get('equipements') as FormArray; 
  }
  get dispoArray():  FormArray { 
    return this.dispoForm.get('disponibilites') as FormArray; 
  }
 
  tarifGroup(i: number): FormGroup { return this.tarifsArray.at(i) as FormGroup; }
  equipGroup(i: number): FormGroup { return this.equipArray.at(i)  as FormGroup; }
  dispoGroup(i: number): FormGroup { return this.dispoArray.at(i)  as FormGroup; }
 
  // ── Factories de groupes ──────────────────────────────────────────────────
 
  private newTarifGroup(): FormGroup {
    return this.fb.group({
      unite:     ['',   Validators.required],
      prix:      [null, [Validators.required, Validators.min(0)]],
      duree_min: [1,    [Validators.required, Validators.min(1)]],
    });
  }
 
  private newEquipGroup(): FormGroup {
    return this.fb.group({
      nom:        ['', Validators.required],
      inclus:     [true],
      prix_option:[null],
      icone:      ['bi-check-circle'],
    });
  }
 
  private newDispoGroup(): FormGroup {
    return this.fb.group({
      date_debut: ['', Validators.required],
      date_fin:   ['', Validators.required],
      motif:      ['BLOQUE', Validators.required],
    }, { validators: this.dispoDateValidator });
  }
 
  // ── Gestion dynamique des lignes ──────────────────────────────────────────
 
  addTarif(): void              { this.tarifsArray.push(this.newTarifGroup()); }
  removeTarif(i: number): void  { 
    if (this.tarifsArray.length > 1) 
      this.tarifsArray.removeAt(i); 
    }
 
  addEquipement(): void              { this.equipArray.push(this.newEquipGroup()); }
  removeEquipement(i: number): void  { this.equipArray.removeAt(i); }
 
  addDispo(): void              { this.dispoArray.push(this.newDispoGroup()); }
  removeDispo(i: number): void  { this.dispoArray.removeAt(i); }
 
  equipInclus(i: number): boolean {
    return this.equipArray.at(i).get('inclus')?.value === true;
  }
 
  dispoInvalide(i: number): boolean {
    return this.dispoArray.at(i).hasError('dateInvalide')
      && this.dispoArray.at(i).touched;
  }
 
  // ─────────────────────────────────────────────────────────────────────────
  // Chargement en mode édition
  // ─────────────────────────────────────────────────────────────────────────
 
  private loadForEdit(id: string): void {
    this.loading.set(true);
    this.svc.getById(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => { this.patchAllForms(data); this.loading.set(false); },
      error: ()    => {
        this.globalError.set("Impossible de charger cet espace."); 
        this.loading.set(false); 
      },
    });
  }
 
  private patchAllForms(d: EspaceEvenementielDetail): void {
    // Étape 0 — Informations
    this.infoForm.patchValue({
      nom: d.nom, type_espace: d.type_espace,
      localisation_approx: d.localisation_approx,
      adresse_complete: d.adresse_complete,
      description: d.description,
    });
 
    // Étape 1 — Capacité
    this.capaciteForm.patchValue({
      capacite_min: d.capacite_min,
      capacite_max: d.capacite_max,
      superficie_m2: d.superficie_m2,
    });
 
    // Étape 2 — Tarifs
    this.tarifsArray.clear();
    const tarifs = d.tarifs.length ? d.tarifs : [null];
    tarifs.forEach((t) => {
      const g = this.newTarifGroup();
      if (t) g.patchValue({ unite: t.unite, prix: t.prix, duree_min: t.duree_min });
      this.tarifsArray.push(g);
    });
 
    // Étape 3 — Équipements
    this.equipArray.clear();
    d.equipements.forEach((e) => {
      const g = this.newEquipGroup();
      g.patchValue(
        { 
          nom: e.nom, 
          inclus: e.inclus, 
          prix_option: e.prix_option, 
          icone: e.icone 
        });
      this.equipArray.push(g);
    });
 
    // Étape 4 — Disponibilités
    this.dispoArray.clear();
    d.indisponibilites.forEach((dl) => {
      const g = this.newDispoGroup();
      g.patchValue({
        date_debut: dl.date_debut.slice(0, 16),  // format datetime-local
        date_fin:   dl.date_fin.slice(0, 16),
        motif:      dl.motif,
      });
      this.dispoArray.push(g);
    });
 
    // Étape 5 — Photos (déjà sur le serveur)
    // Les photos sont triées par ordre côté Django (ordering = ['ordre', 'created_at'])
    this.photos.set(
      d.photos.map(p => ({
        file:         null,
        previewUrl:   p.image,      // URL absolue renvoyée par Django
        legende:      p.legende,
        ordre:        p.ordre,
        uploading:    false,
        uploadError:  null,
        uploaded:     p,
      }))
    );
  }
 
  // ─────────────────────────────────────────────────────────────────────────
  // Sauvegarde séquentielle par étape
  // ─────────────────────────────────────────────────────────────────────────
 
  async saveStepAndNext(): Promise<void> {
    const step = this.activeStep();
    this.clearStepError(step);
 
    if (!this.currentFormValid(step)) {
      this.markCurrentFormTouched(step);
      return;
    }
 
    this.stepSaving.set(true);
    try {
      await this.saveStep(step);
      this.stepSaving.set(false);
      if (step < this.STEPS.length - 1) {
        this.activeStep.update(s => s + 1);
      } else {
        // Dernière étape terminée → page détail
        this.router.navigate(['/lango/evenementiel/espaces', this.espaceId(), 'detail']);
      }
    } catch (err: unknown) {
      this.stepSaving.set(false);
      this.setStepError(step, this.extractError(err));
    }
  }
 
  private saveStep(step: number): Promise<void> {
    switch (step) {
      case 0: return this.saveInfo();
      case 1: return this.saveCapacite();
      case 2: return this.saveTarifs();
      case 3: return this.saveEquipements();
      case 4: return this.saveDisponibilites();
      case 5: return this.savePhotos();
      default: return Promise.resolve();
    }
  }
 
  // ── Étape 0 : informations de base ────────────────────────────────────────
 
  private saveInfo(): Promise<void> {
    const v = this.infoForm.value;
    const basePayload = {
      nom:                 v.nom,
      type_espace:         v.type_espace,
      localisation_approx: v.localisation_approx,
      adresse_complete:    v.adresse_complete ?? '',
      description:         v.description,
    };
 
    // Création : capacite_max=1 temporaire, réécrit à l'étape 1
    const obs = this.espaceId()
      ? this.svc.patch(this.espaceId()!, basePayload)
      : this.svc.create({ ...basePayload, capacite_max: 1 });
 
    return new Promise((resolve, reject) =>
      obs.pipe(takeUntil(this.destroy$)).subscribe({
        next: (e) => { this.espaceId.set(e.id); resolve(); },
        error: reject,
      })
    );
  }
 
  // ── Étape 1 : capacité ────────────────────────────────────────────────────
 
  private saveCapacite(): Promise<void> {
    const v = this.capaciteForm.value;
    return new Promise((resolve, reject) =>
      this.svc.patch(this.requireId(), {
        capacite_min:  v.capacite_min,
        capacite_max:  v.capacite_max,
        superficie_m2: v.superficie_m2 ?? null,
      }).pipe(takeUntil(this.destroy$)).subscribe({ 
        next: () => resolve(), error: reject 
      })
    );
  }
 
  // ── Étape 2 : tarifs ──────────────────────────────────────────────────────
 
  private saveTarifs(): Promise<void> {
    const payload: TarifPayload[] = this.tarifsArray.value.map((t: any) => ({
      unite:     t.unite,
      prix:      Number(t.prix),
      duree_min: Number(t.duree_min),
      est_actif: true,
    }));
    return new Promise((resolve, reject) =>
      this.svc.saveTarifs(this.requireId(), payload)
        .pipe(takeUntil(this.destroy$)).subscribe({ next: () => resolve(), error: reject })
    );
  }
 
  // ── Étape 3 : équipements ─────────────────────────────────────────────────
 
  private saveEquipements(): Promise<void> {
    if (this.equipArray.length === 0) return Promise.resolve();
    const payload: EquipementPayload[] = this.equipArray.value.map((e: any) => ({
      nom:        e.nom,
      inclus:     e.inclus,
      prix_option: e.inclus ? null : (Number(e.prix_option) || null),
      icone:      e.icone || 'bi-check-circle',
    }));
    return new Promise((resolve, reject) =>
      this.svc.saveEquipements(this.requireId(), payload)
        .pipe(takeUntil(this.destroy$)).subscribe({ next: () => resolve(), error: reject })
    );
  }
 
  // ── Étape 4 : disponibilités ──────────────────────────────────────────────
 
  private saveDisponibilites(): Promise<void> {
    if (this.dispoArray.length === 0) return Promise.resolve();
    const payload: DisponibilitePayload[] = this.dispoArray.value.map((d: any) => ({
      date_debut: new Date(d.date_debut).toISOString(),
      date_fin:   new Date(d.date_fin).toISOString(),
      motif:      d.motif,
    }));
    return new Promise((resolve, reject) =>
      this.svc.saveDisponibilites(this.requireId(), payload)
        .pipe(takeUntil(this.destroy$)).subscribe({ next: () => resolve(), error: reject })
    );
  }
 
  // ── Étape 5 : photos ─────────────────────────────────────────────────────
 
  /**
   * Upload séquentiel : traite chaque photo en attente (file non null, pas encore
   * uploadée). L'ordre envoyé est l'index courant dans la liste pour respecter
   * l'ordre visuel affiché dans le formulaire.
   */
  private async savePhotos(): Promise<void> {
    const id = this.requireId();
    const pending = this.photos().filter(p => p.file !== null && p.uploaded === null);
 
    for (const ph of pending) {
      const idx = this.photos().findIndex(p => p === ph);
      this.updatePhoto(idx, { uploading: true, uploadError: null });
 
      const uploadPayload: PhotoUploadPayload = {
        image:   ph.file!,
        legende: ph.legende,
        ordre:   idx,        // ordre = position dans la liste visuelle
      };
 
      try {
        const uploaded = await new Promise<PhotoEspace>((resolve, reject) =>
          this.svc.uploadPhoto(id, uploadPayload)
            .pipe(takeUntil(this.destroy$))
            .subscribe({ next: resolve, error: reject })
        );
        this.updatePhoto(idx, { uploading: false, uploaded, ordre: uploaded.ordre });
      } catch (err: unknown) {
        const msg = this.extractPhotoError(err);
        this.updatePhoto(idx, { uploading: false, uploadError: msg });
        // On ne bloque pas les autres photos — on continue et on signale à la fin
      }
    }
 
    // Vérifier si des photos ont échoué
    const failures = this.photos().filter(p => p.uploadError !== null);
    if (failures.length > 0) {
      throw new Error(
        `${failures.length} photo(s) n'ont pas pu être uploadées. 
        Corrigez les erreurs et réessayez.`
      );
    }
  }
 
  // ─────────────────────────────────────────────────────────────────────────
  // Gestion des photos dans l'UI
  // ─────────────────────────────────────────────────────────────────────────
 
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.addFiles(Array.from(input.files));
    input.value = '';  // reset pour permettre la re-sélection du même fichier
  }
 
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.photosDragOver.set(false);
    const files = event.dataTransfer?.files;
    if (files) this.addFiles(Array.from(files));
  }
 
  onDragOver(event: DragEvent): void  { 
    event.preventDefault(); this.photosDragOver.set(true); 
  }
  onDragLeave(): void { this.photosDragOver.set(false); }
 
  private addFiles(files: File[]): void {
    const remaining = this.MAX_PHOTOS - this.photos().length;
    if (remaining <= 0) return;
 
    const images = files
      .filter(f => f.type.startsWith('image/'))
      .slice(0, remaining);
 
    const previews: PhotoPreview[] = images.map((file, i) => ({
      file,
      previewUrl:  URL.createObjectURL(file),
      legende:     '',
      ordre:       this.photos().length + i,
      uploading:   false,
      uploadError: null,
      uploaded:    null,
    }));
 
    this.photos.update(p => [...p, ...previews]);
  }
 
  removePhoto(index: number): void {
    const ph = this.photos()[index];
    // Supprimer côté serveur si déjà uploadée
    const id = this.espaceId();
    if (ph.uploaded && id) {
      this.svc.deletePhoto(id, ph.uploaded.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe();
    }
    // Libérer la mémoire de la prévisualisation locale
    if (ph.file && ph.previewUrl) URL.revokeObjectURL(ph.previewUrl);
    // Retirer de la liste et recalculer les ordres
    this.photos.update(list =>
      list
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, ordre: i }))
    );
  }
 
  updateLegende(index: number, legende: string): void {
    this.updatePhoto(index, { legende });
  }
 
  /** Déplace une photo vers le haut dans la liste */
  movePhotoUp(index: number): void {
    if (index === 0) return;
    this.swapPhotos(index, index - 1);
  }
 
  /** Déplace une photo vers le bas dans la liste */
  movePhotoDown(index: number): void {
    if (index === this.photos().length - 1) return;
    this.swapPhotos(index, index + 1);
  }
 
  private swapPhotos(a: number, b: number): void {
    this.photos.update(list => {
      const updated = [...list];
      [updated[a], updated[b]] = [updated[b], updated[a]];
      // Mettre à jour l'ordre logique
      return updated.map((p, i) => ({ ...p, ordre: i }));
    });
  }
 
  /**
   * Définit une photo comme principale.
   * Si déjà uploadée → appel API immédiat.
   * Si en attente → marquage local 
   * (sera la principale au prochain upload car 1ère uploadée).
   */
  setPrincipale(index: number): void {
    const ph = this.photos()[index];
    const id = this.espaceId();
 
    if (ph.uploaded && id) {
      this.svc.setPhotoPrincipale(id, ph.uploaded.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updated) => {
            // Mettre à jour toutes les photos : réinitialiser est_principale
            this.photos.update(list =>
              list.map((p, i) => ({
                ...p,
                uploaded: p.uploaded
                  ? { ...p.uploaded, est_principale: i === index }
                  : null,
              }))
            );
          },
        });
    }
  }
 
  private updatePhoto(index: number, patch: Partial<PhotoPreview>): void {
    this.photos.update(list =>
      list.map((p, i) => i === index ? { ...p, ...patch } : p)
    );
  }
 
  // ─────────────────────────────────────────────────────────────────────────
  // Helpers wizard
  // ─────────────────────────────────────────────────────────────────────────
 
  goToStep(index: number): void {
    // On peut revenir en arrière librement,
    // avancer uniquement si l'espace est déjà créé (id non null)
    const canAdvance = index > 0 ? !!this.espaceId() : true;
    if (index < this.activeStep() || canAdvance) {
      this.activeStep.set(index);
    }
  }
 
  prevStep(): void {
    if (this.activeStep() > 0) this.activeStep.update(s => s - 1);
  }
 

  onBack(): void {
    this.router.navigate(['/lango/evenementiel/espaces']);
  }
  currentFormValid(step: number): boolean {
    const validators: boolean[] = [
      this.infoForm.valid,
      this.capaciteForm.valid,
      this.tarifsForm.valid,
      this.equipArray.length === 0 || this.equipForm.valid,
      this.dispoArray.length === 0 || this.dispoForm.valid,
      true,  // photos : étape toujours valide (optionnel)
    ];
    return validators[step] ?? true;
  }
 
  private markCurrentFormTouched(step: number): void {
    const forms = [
      this.infoForm, this.capaciteForm, this.tarifsForm, this.equipForm, this.dispoForm
    ];
    forms[step]?.markAllAsTouched();
  }
 
  isLastStep(): boolean    { return this.activeStep() === this.STEPS.length - 1; }
  photosPending(): number  { 
    return this.photos().filter(p => p.file && !p.uploaded).length; 
  }
  photosUploaded(): number { return this.photos().filter(p => !!p.uploaded).length; }
  photosWithError(): number{ 
    return this.photos().filter(p => !!p.uploadError).length; 
  }
 
  // ─────────────────────────────────────────────────────────────────────────
  // Helpers erreurs & validation template
  // ─────────────────────────────────────────────────────────────────────────
 
  private requireId(): string {
    const id = this.espaceId();
    if (!id) throw new Error("L'espace doit d'abord être créé (étape Informations).");
    return id;
  }
 
  private setStepError(step: number, msg: string): void {
    this.stepErrors.update(e => ({ ...e, [step]: msg }));
  }
 
  private clearStepError(step: number): void {
    this.stepErrors.update(e => ({ ...e, [step]: null }));
  }
 
  stepError(step: number): string | null {
    return this.stepErrors()[step] ?? null;
  }
 
  fieldError(form: FormGroup, field: string): string | null {
    const ctrl = form.get(field);
    if (!ctrl?.invalid || !ctrl.touched) return null;
    if (ctrl.hasError('required'))  return 'Champ obligatoire.';
    if (ctrl.hasError('minlength')) 
      return `Minimum ${ctrl.errors?.['minlength']?.requiredLength} caractères.`;
    if (ctrl.hasError('maxlength')) 
      return `Maximum ${ctrl.errors?.['maxlength']?.requiredLength} caractères.`;
    if (ctrl.hasError('min'))       
      return `Valeur minimale : ${ctrl.errors?.['min']?.min}.`;
    return 'Valeur invalide.';
  }
 
  typeLabel(v: string): string  { 
    return this.typeOptions.find(t => t.value === v)?.label ?? v; 
  }
  uniteLabel(v: string): string { 
    return this.uniteOptions.find(u => u.value === v)?.label ?? v; 
  }
 
  private extractError(err: unknown): string {
    const e = err as any;
    const data = e?.error;
    if (!data) return "Erreur inattendue. Veuillez réessayer.";
    if (typeof data === 'string') return data;
    return Object.entries(data)
      .map(([k, v]) => `${k} : ${Array.isArray(v) ? (v as string[]).join(', ') : v}`)
      .join(' | ') || "Erreur de validation.";
  }
 
  private extractPhotoError(err: unknown): string {
    const e = err as any;
    const data = e?.error;
    if (!data) return "Échec de l'upload.";
    if (data?.image) return Array.isArray(data.image) ? data.image[0] : data.image;
    if (typeof data === 'string') return data;
    return "Échec de l'upload.";
  }

}
