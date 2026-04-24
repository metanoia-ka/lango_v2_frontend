import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationService } from '../../confirmation-modal/service/confirmation';
import { ToastService } from '../../../services/toast.service';
import { TypeBienService } from '../services/categorie-type-bien-immobilier';
import { CategorieBien, TypeBienImmobilier } from '../models/categorie-type-bien-immobilier.model';

@Component({
  selector: 'app-categorie-type-bien',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgbTooltipModule],
  templateUrl: './categorie-type-bien.html',
  styleUrl: './categorie-type-bien.scss'
})
export class CategorieTypeBien implements OnInit {

  private svc          = inject(TypeBienService);
  private confirmation = inject(ConfirmationService);
  private toast        = inject(ToastService);
  private fb           = inject(FormBuilder);

  // ── État ──────────────────────────────────────────────────────────────────
  categories   = this.svc.categories;
  types        = this.svc.types;
  loading      = signal(false);
  saving       = signal(false);
  error        = signal('');

  // Onglet actif
  onglet       = signal<'categories' | 'types'>('categories');

  // Filtre types par catégorie
  filtreCat    = signal('');
  typesFiltres = computed(() => {
    const f = this.filtreCat();
    return f
      ? this.types().filter(t => t.categorie === f)
      : this.types();
  });

  // Formulaires
  catForm!:  FormGroup;
  typeForm!: FormGroup;

  // Mode édition (null = création)
  editingCat  = signal<CategorieBien | null>(null);
  editingType = signal<TypeBienImmobilier | null>(null);

  readonly ICONES_CATEGORIES = [
    'bi-house-fill', 'bi-shop-window', 'bi-geo-alt-fill',
    'bi-building-fill', 'bi-tree-fill', 'bi-grid-1x2-fill',
  ];

  readonly COULEURS = [
    '#008753', '#3C3489', '#B45309', '#1D4ED8', '#7C3AED', '#DC2626',
  ];

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this._initForms();
    this.charger();
  }

  private _initForms(): void {
    this.catForm = this.fb.group({
      nom:         ['', [
        Validators.required, Validators.minLength(2), Validators.maxLength(100)
      ]
      ],
      description: [''],
      icone:       ['bi-house-fill'],
      couleur:     ['#008753'],
      ordre:       [0],
    });

    this.typeForm = this.fb.group({
      categorie:          ['', Validators.required],
      nom:                ['', [Validators.required, Validators.minLength(2)]],
      description:        [''],
      icone:              [''],
      ordre:              [0],
      meuble:             [false],
      necessite_parcelle: [false],
    });
  }

  charger(): void {
    this.loading.set(true);
    this.svc.getCategories().subscribe({
      next: () => {
        this.svc.getTypes().subscribe({
          next:  () => this.loading.set(false),
          error: () => this.loading.set(false),
        });
      },
      error: () => {
        this.error.set('Erreur chargement.');
        this.loading.set(false);
      }
    });
  }

  // ── CATÉGORIES ────────────────────────────────────────────────────────────

  ouvrirFormCat(cat?: CategorieBien): void {
    this.editingCat.set(cat ?? null);
    this.catForm.reset({
      nom:         cat?.nom         ?? '',
      description: cat?.description ?? '',
      icone:       cat?.icone       ?? 'bi-house-fill',
      couleur:     cat?.couleur     ?? '#008753',
      ordre:       cat?.ordre       ?? 0,
    });
    this.error.set('');
  }

  annulerCat(): void { this.editingCat.set(null); this.catForm.reset(); }

  sauvegarderCat(): void {
    if (this.catForm.invalid) { this.catForm.markAllAsTouched(); return; }
    this.saving.set(true);
    const payload = this.catForm.value;
    const editing = this.editingCat();

    const obs$ = editing
      ? this.svc.updateCategorie(editing.id, payload)
      : this.svc.createCategorie(payload);

    obs$.subscribe({
      next: () => {
        this.toast.showSuccess(editing ? 'Catégorie mise à jour.' : 'Catégorie créée.');
        this.annulerCat();
        this.saving.set(false);
      },
      error: e => {
        this.error.set(e.error?.nom?.[0] ?? e.error?.detail ?? 'Erreur.');
        this.saving.set(false);
      }
    });
  }

  async supprimerCat(cat: CategorieBien): Promise<void> {
    if (cat.nb_types > 0) {
      this.toast.showError(
        `Impossible : ${cat.nb_types} type(s) rattaché(s). Supprimez-les d'abord.`
      );
      return;
    }
    const ok = await this.confirmation.confirm({
      title:        'Supprimer la catégorie',
      type:         'bg-danger',
      message:      `Supprimer définitivement « ${cat.nom} » ?`,
      icon:         'bi-trash',
      confirmLabel: 'Oui, supprimer',
      cancelLabel:  'Annuler',
    });
    if (!ok) return;

    this.svc.deleteCategorie(cat.id).subscribe({
      next:  () => this.toast.showSuccess('Catégorie supprimée.'),
      error: e => this.toast.showError(e.error?.detail ?? 'Erreur suppression.'),
    });
  }

  // ── TYPES ─────────────────────────────────────────────────────────────────

  ouvrirFormType(type?: TypeBienImmobilier): void {
    this.editingType.set(type ?? null);
    this.typeForm.reset({
      categorie:          type?.categorie          ?? '',
      nom:                type?.nom                ?? '',
      description:        type?.description        ?? '',
      ordre:              type?.ordre              ?? 0,
      meuble:             type?.meuble             ?? false,
      necessite_parcelle: type?.necessite_parcelle ?? false,
    });
    this.error.set('');
  }

  annulerType(): void { this.editingType.set(null); this.typeForm.reset(); }

  sauvegarderType(): void {
    if (this.typeForm.invalid) { this.typeForm.markAllAsTouched(); return; }
    this.saving.set(true);
    const payload  = this.typeForm.value;
    const editing  = this.editingType();

    const obs$ = editing
      ? this.svc.updateType(editing.id, payload)
      : this.svc.createType(payload);

    obs$.subscribe({
      next: () => {
        this.toast.showSuccess(editing ? 'Type mis à jour.' : 'Type créé.');
        this.annulerType();
        this.saving.set(false);
      },
      error: e => {
        this.error.set(e.error?.nom?.[0] ?? e.error?.detail ?? 'Erreur.');
        this.saving.set(false);
      }
    });
  }

  toggleActif(type: TypeBienImmobilier): void {
    this.svc.toggleType(type.id).subscribe({
      next: res => this.toast.showSuccess(res.detail),
      error: e => this.toast.showError(e.error?.detail ?? 'Erreur.'),
    });
  }

  async supprimerType(type: TypeBienImmobilier): Promise<void> {
    const ok = await this.confirmation.confirm({
      title:        'Supprimer le type',
      type:         'bg-danger',
      message:      `Supprimer « ${type.nom} » ? Cette action est irréversible.`,
      icon:         'bi-trash',
      confirmLabel: 'Oui, supprimer',
      cancelLabel:  'Annuler',
    });
    if (!ok) return;

    this.svc.deleteType(type.id).subscribe({
      next:  () => this.toast.showSuccess('Type supprimé.'),
      error: e  => this.toast.showError(e.error?.detail ?? 'Erreur suppression.'),
    });
  }

  // ── Helpers template ──────────────────────────────────────────────────────
  getCatNom(id: string): string {
    return this.categories().find(c => c.id === id)?.nom ?? '—';
  }

  isFieldInvalid(form: FormGroup, field: string): boolean {
    const ctrl = form.get(field);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }

}
