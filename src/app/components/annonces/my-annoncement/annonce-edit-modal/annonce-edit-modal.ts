import { CommonModule, DecimalPipe } from '@angular/common';
import {
  ChangeDetectorRef, Component,
  ElementRef,
  inject, Input, OnDestroy, OnInit, signal,
  ViewChild
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { AnnonceService } from '../../services/annonce.service';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';
import { TypeAnnonce } from '../../models/type-annonce.model';
import { TypeAnnonceService } from '../../services/type-annonce.service';
import { 
  BienResume, CreateAnnonce, UpdateAnnonce, bienLabel 
} from '../../models/annonce.model';
import { BienImmobilierService } from '../../../foncier/services/bien-immobilier';
import { Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
 
@Component({
  selector: 'app-annonce-edit-modal',
  imports: [CommonModule, ReactiveFormsModule, DecimalPipe],
  templateUrl: './annonce-edit-modal.html',
  styleUrl: './annonce-edit-modal.scss'
})
export class AnnonceEditModal implements OnInit, OnDestroy {
 
  @Input() annonceId: string | null = null;

  // ViewChild pour l'input file
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  annonceForm!: FormGroup;
  selectedFile: File | null = null;
  imagePreview: string | null = null;  // Pour la prévisualisation
  existingImageUrl: string | null = null;  // Image existante en mode édition

  private cdr = inject(ChangeDetectorRef);
  private activeModal = inject(NgbActiveModal);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private subscription = new Subscription();

  private annonceService = inject(AnnonceService);
  private typeAnnonceService = inject(TypeAnnonceService);
  private bienService = inject(BienImmobilierService);
  private confirmation = inject(ConfirmationService);

  isLoading = signal(true);
  isSubmitting = signal(false);
  errorMessage: string | null = null;
  successMessage = '';
  isEditMode = false;
  error = signal('');
  success = signal('');

  typeAnnonces: TypeAnnonce[] = [];

  biens = signal<BienResume[]>([]);
  biensLoading = signal(false);
  bienVerrouille = signal<BienResume | null>(null);

  readonly bienLabel = bienLabel;

  // Constantes de validation
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.isEditMode = !!this.annonceId;
    this.initForm();
    this.loadTypeAnnonces();
    this.subscribeToTypeAnnonce();

    if (this.isEditMode) {
      this.loadAnnonce();
    } else {
      this.loadBiensDisponibles();
      this.isLoading.set(false);
    }
  }

  ngOnDestroy(): void {
    // Nettoyer l'URL de prévisualisation
    if (this.imagePreview) {
      URL.revokeObjectURL(this.imagePreview);
    }
    this.subscription.unsubscribe();
  }

  // ── Init formulaire ──────────────────────────────────────────────────────────

  initForm(): void {
    this.annonceForm = this.fb.group({
      titre: [''],
      contenu: [''],
      bien_id: ['', Validators.required],
      type_annonce_id: ['', Validators.required],
      date_debut: ['', Validators.required],
      date_fin: [''],
      image_principale: [null],
    });
  }

  // ── Chargement ────────────────────────────────────────────────────────────────

  private loadTypeAnnonces(): void {
    this.typeAnnonceService.fetchTypeAnnonces();
  }

  private subscribeToTypeAnnonce(): void {
    this.subscription.add(
      this.typeAnnonceService.typeAnnonces$.subscribe({
        next: data => { this.typeAnnonces = data; },
        error: err => {
          this.error.set(
            err.error?.detail ?? 'Impossible de charger les types d\'annonces.'
          );
        }
      })
    );
  }

  private loadAnnonce(): void {
    this.isLoading.set(true);
    this.subscription.add(
      this.annonceService.getAnnonce(this.annonceId!).subscribe({
        next: annonce => {
          if (annonce.bien) this.bienVerrouille.set(annonce.bien);

          // Stocker l'URL de l'image existante
          if (annonce.image_principale) {
            this.existingImageUrl = annonce.image_principale;
          }

          this.annonceForm.patchValue({
            titre: annonce.titre,
            contenu: annonce.contenu,
            bien_id: annonce.bien?.id ?? '',
            type_annonce_id: annonce.type_annonce.id,
            date_debut: this._formatDateForInput(annonce.date_debut),
            date_fin: this._formatDateForInput(annonce.date_fin ?? null),
          });
          this.isLoading.set(false);
        },
        error: err => {
          this.isLoading.set(false);
          this.error.set(err.error?.detail ?? 'Impossible de charger l\'annonce.');
        }
      })
    );
  }

  private loadBiensDisponibles(): void {
    this.biensLoading.set(true);
    this.subscription.add(
      this.bienService.getMesBiensSansAnnonce().subscribe({
        next: data => { this.biens.set(data); this.biensLoading.set(false); },
        error: () => { this.biens.set([]); this.biensLoading.set(false); }
      })
    );
  }

  // ── Gestion des fichiers ─────────────────────────────────────────────────────

  /**
   * Déclenche le clic sur l'input file caché
   */
  triggerFileInput(): void {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  /**
   * Gère la sélection d'un fichier
   */
  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    // Validation du type de fichier
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      this.error.set('Type de fichier non supporté. Utilisez JPG, PNG ou WEBP.');
      input.value = ''; // Réinitialiser l'input
      return;
    }

    // Validation de la taille
    if (file.size > this.MAX_FILE_SIZE) {
      this.error.set(`Le fichier est trop volumineux. Taille max : ${this.MAX_FILE_SIZE / (1024 * 1024)} MB`);
      input.value = '';
      return;
    }

    // Nettoyer l'ancienne prévisualisation
    if (this.imagePreview) {
      URL.revokeObjectURL(this.imagePreview);
    }

    // Créer une prévisualisation
    this.imagePreview = URL.createObjectURL(file);
    this.selectedFile = file;
    this.existingImageUrl = null; // On remplace l'image existante

    // Mettre à jour le formulaire
    this.annonceForm.patchValue({ image_principale: file });
    this.annonceForm.get('image_principale')?.markAsDirty();

    // Réinitialiser l'input pour permettre de resélectionner le même fichier
    input.value = '';

    // Nettoyer les erreurs
    this.error.set('');
    this.cdr.detectChanges();
  }

  /**
   * Supprime l'image sélectionnée
   */
  removeImage(event: Event): void {
    event.stopPropagation(); // Empêcher le déclenchement du clic sur la dropzone

    // Nettoyer la prévisualisation
    if (this.imagePreview) {
      URL.revokeObjectURL(this.imagePreview);
      this.imagePreview = null;
    }

    this.selectedFile = null;
    this.annonceForm.patchValue({ image_principale: null });

    // Réinitialiser l'input file
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }

    this.cdr.detectChanges();
  }

  // ── Helpers template ─────────────────────────────────────────────────────────

  get bienSelectionne(): BienResume | undefined {
    const id = this.annonceForm.get('bien_id')?.value;
    return this.biens().find(b => b.id === id);
  }

  get prixAffiche(): number | undefined {
    if (this.isEditMode) return this.bienVerrouille()?.prix_principal;
    return this.bienSelectionne?.prix_principal;
  }

  get prixUnite(): string {
    const bien = this.isEditMode ? this.bienVerrouille() : this.bienSelectionne;
    if (!bien) return '';
    return bien.type_transaction === 'LOCATION' ? 'XAF/mois' : 'XAF';
  }

  private _formatDateForInput(dateString: string | null): string | null {
    if (!dateString) return null;
    const d = new Date(dateString);
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60 * 1000).toISOString().split('T')[0];
  }

  goBiensImmobiliers(): void {
    this.activeModal.dismiss();
    this.router.navigateByUrl('/lango/biens-immobiliers');
  }

  // ── Submit ────────────────────────────────────────────────────────────────────

  async onConfirm(): Promise<void> {
    const mode = this.isEditMode ? 'modifier' : 'créer';
    const confirmed = await this.confirmation.confirm({
      title: 'Confirmation',
      type: 'bg-success',
      message: `Cette action va ${mode} l'annonce. Voulez-vous continuer ?`,
      icon: 'bi-bell',
      confirmLabel: 'Oui, confirmer',
      cancelLabel: 'Annuler',
    });
    if (!confirmed) return;
    this.onSubmit();
  }

  onSubmit(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.annonceForm.invalid) {
      this.error.set('Veuillez remplir tous les champs requis.');
      this.annonceForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const v = this.annonceForm.getRawValue();

    if (this.isEditMode) {
      const payload: UpdateAnnonce = {
        titre: v.titre || undefined,
        contenu: v.contenu || undefined,
        type_annonce_id: v.type_annonce_id,
        date_debut: v.date_debut || undefined,
        date_fin: v.date_fin || undefined,
        image_principale: this.selectedFile ?? undefined,
      };

      this.subscription.add(
        this.annonceService.updateAnnonce(this.annonceId!, payload).subscribe({
          next: () => {
            this.success.set('🎉 Annonce mise à jour avec succès !');
            this.isSubmitting.set(false);
            this.cdr.detectChanges();
            setTimeout(() => this.activeModal.close('updated'), 1500);
          },
          error: err => {
            this.error.set(`Erreur mise à jour: ${err.error?.detail || 'Erreur inconnue'}.`);
            this.isSubmitting.set(false);
            this.cdr.detectChanges();
          }
        })
      );

    } else {
      const payload: CreateAnnonce = {
        bien_id: v.bien_id,
        type_annonce_id: v.type_annonce_id,
        date_debut: v.date_debut,
        date_fin: v.date_fin || undefined,
        titre: v.titre || undefined,
        contenu: v.contenu || undefined,
        image_principale: this.selectedFile ?? undefined,
      };

      this.subscription.add(
        this.annonceService.createFromBien(payload).subscribe({
          next: () => {
            this.success.set(`🎉 Annonce créée avec succès ! 
                            Elle est désormais en cours de vérification par un agent.`) ;
            this.isSubmitting.set(false);
            this.cdr.detectChanges();
            setTimeout(() => this.activeModal.close('created'), 1500);
          },
          error: err => {
            this.error.set(`Erreur création: 
              ${err.error?.detail 
              || `Une erreur est survenue lors de la vérification 
                  de vos droits de publication.`}.`);
            this.isSubmitting.set(false);
            this.cdr.detectChanges();
          }
        })
      );
    }
  }

  onCancel(): void {
    this.activeModal.dismiss();
  }
}