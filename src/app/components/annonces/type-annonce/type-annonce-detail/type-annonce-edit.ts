import { CommonModule } from '@angular/common';
import { 
  ChangeDetectorRef, Component, inject, Input, OnDestroy, OnInit 
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { TypeAnnonceService } from '../../services/type-annonce.service';
import { RouterModule } from '@angular/router';
import { Alert } from '../../../alerts/alert/alert';

@Component({
  selector: 'app-type-annonce-edit',
  imports: [CommonModule, RouterModule, Alert, ReactiveFormsModule],
  templateUrl: './type-annonce-edit.html',
  styleUrl: './type-annonce-edit.scss'
})
export class TypeAnnonceEditModal implements OnInit, OnDestroy{

  @Input() typeAnnonceSlug: string | null = null;

  typeAnnonceForm!: FormGroup;
  isEditMode: boolean = false;
  isLoading: boolean = false;
  isSubmitting = false;

  messageRedirecting: string = '';
  responseType: 'success' | 'error' = 'success';
  successMessage: string = '';
  errorMessage: string = '';

  // Palette de couleurs prédéfinies
  colorPalette = [
    '#008753', // Primary
    '#FCD116', // Secondary
    '#dc3545', // Danger
    '#0d6efd', // Info
    '#6f42c1', // Purple
    '#fd7e14', // Orange
    '#20c997', // Teal
    '#6610f2'  // Indigo
  ];

  clearSuccessMessage() {
    this.successMessage = '';
  }

  clearErrorMessage() {
    this.errorMessage = '';
  }
  
  private subscriptions = new Subscription();
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>()

  private activeModal = inject(NgbActiveModal);
  private fb = inject(FormBuilder);
  private typeAnnonceService = inject(TypeAnnonceService);

  ngOnInit(): void {
    this.isLoading = true;
    this.isEditMode = !!this.typeAnnonceSlug;
    this.initForm();

    if (this.isEditMode && this.typeAnnonceSlug) {
      this.loadTypeAnnonce();
    } else {
      this.isLoading = false;
    }

    this.typeAnnonceForm.get('nom')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(nom => {
        if (!this.isEditMode && nom && !this.typeAnnonceForm.get('slug')?.dirty) {
          const slug = nom.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
          this.typeAnnonceForm.patchValue({ slug });
        }
      });
  }

  initForm(): void {
    this.typeAnnonceForm = this.fb.group({
      nom: [
        { value: '', disabled: false },
        [Validators.required, Validators.maxLength(30)]
      ],
      slug: [''],
      description: ['', Validators.maxLength(500)],
      icone: ['bi-tag'],
      couleur: ['#008753', Validators.required],
      actif: [true],
      ordre: [0, [Validators.required, Validators.min(0)]]
    });
  }

  loadTypeAnnonce(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.subscriptions.add(
      this.typeAnnonceService.getTypeAnnonce(this.typeAnnonceSlug!).subscribe({
        next: (type) => {
          this.typeAnnonceForm.patchValue({
            nom: type.nom,
            slug: type.slug,
            description: type.description,
            icone: type.icone,
            couleur: type.couleur,
            actif: type.actif,
            ordre: type.ordre
          });
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = `Erreur lors du chargement des types d'annonce': 
            ${err.message || err.statusText}`;
          this.responseType = 'error';
          this.isLoading = false;
          this.activeModal.dismiss();
        }
      })
    );
  }

  onSubmit(event?: Event): void {

    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (this.typeAnnonceForm.invalid) {
      this.errorMessage = 'Veuillez remplir tous les champs requis.';
      this.typeAnnonceForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    const formValue = this.typeAnnonceForm.value;

    const typeAnnonceToSave = {
      nom: formValue.nom,
      slug: formValue.slug,
      description: formValue.description?.trim() === '' ? '' : formValue.description,
      icone: formValue.icone,
      couleur: formValue.couleur,
      actif: formValue.actif,
      ordre: formValue.ordre
    };

    if (this.isEditMode) {
      this.subscriptions.add(
        this.typeAnnonceService.updateTypeAnnonce(
          this.typeAnnonceSlug!, typeAnnonceToSave
        ).subscribe({
        next: () => {
          this.successMessage = '🎉 Type d\'annonce mis à jour avec succès !';
          this.responseType = 'success';
          this.isSubmitting = false;
          this.isLoading = false;
          this.cdr.detectChanges();
          setTimeout(() => {
            this.activeModal.close('saved');
          }, 3000);
        },
        error: (err) => {
          this.errorMessage = err.error?.detail 
          || 'Erreur lors de la mise à jour du type d\'annonce.';
          this.responseType = 'error';
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      }));
    } else {
      this.subscriptions.add(this.typeAnnonceService.createTypeAnnonce(
        typeAnnonceToSave
      ).subscribe({
        next: (newType) => {
          this.successMessage = '🎉 Type d\'annonce créé avec succès !';
          this.responseType = 'success';
          this.isSubmitting = false;
          this.isLoading = false;
          this.typeAnnonceForm.reset();
          this.cdr.detectChanges();

          setTimeout(() => {
            this.activeModal.close(newType);
          }, 3000);
        },
        error: (err) => {
          this.errorMessage = `❌ Erreur lors de la création du type d'annonce: 
                (status: ${err.status}) -> (message: ${err.statusText})`;
          console.log('Détail de l\'erreur:', JSON.stringify(err.error));
          this.responseType = 'error';
          this.isLoading = false;
          this.isSubmitting = false;
        }
      }));
    }
  }

  get slugError(): string {
    const control = this.typeAnnonceForm.get('slug');
    if (control?.errors?.['required']) return 'Le slug est requis';
    if (control?.errors?.['pattern']) return `Le slug doit contenir 
        uniquement des lettres minuscules, chiffres et tirets`;
    return '';
  }

  setColor(color: string): void {
    this.typeAnnonceForm.patchValue({ couleur: color });
  }

  onCancel(): void {
    this.activeModal.dismiss();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
