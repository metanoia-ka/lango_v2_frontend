import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgbDatepickerModule, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AnnonceService } from '../../services/annonce.service';
import { TypeAnnonceService } from '../../services/type-annonce.service';
import { CreateAnnonce } from '../../models/annonce.model';

@Component({
  selector: 'app-annonce-form',
  imports: [
    CommonModule,
    ReactiveFormsModule, 
    RouterModule,
    NgbDatepickerModule
  ],
  templateUrl: './annonce-form.html',
  styleUrl: './annonce-form.scss'
})
export class AnnonceForm implements OnInit{

  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private annonceService = inject(AnnonceService);
  private typeAnnonceService = inject(TypeAnnonceService);

  // Signaux
  typesAnnonces = this.typeAnnonceService.typesAnnonces;
  isEdit = signal(false);
  isSubmitting = signal(false);
  annonceId = signal<string | null>(null);

  // Formulaire
  annonceForm: FormGroup;
  
  // Image
  imagePreview = signal<string | null>(null);
  imageFile = signal<File | null>(null);

  // Dates min/max
  minDate: NgbDateStruct;
  maxDate: NgbDateStruct;

  constructor() {
    // Dates min/max pour le datepicker
    const today = new Date();
    this.minDate = {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate()
    };
    
    const maxDateObj = new Date();
    maxDateObj.setFullYear(maxDateObj.getFullYear() + 2);
    this.maxDate = {
      year: maxDateObj.getFullYear(),
      month: maxDateObj.getMonth() + 1,
      day: maxDateObj.getDate()
    };

    // Initialisation formulaire
    this.annonceForm = this.fb.group({
      titre: ['', [Validators.required, Validators.maxLength(255)]],
      contenu: ['', [Validators.required, Validators.minLength(20)]],
      type_annonce_id: ['', Validators.required],
      prix: [null, [Validators.min(0)]],
      date_debut: [null, Validators.required],
      date_fin: [null]
    }, {
      validators: this.dateValidator
    });
  }

  ngOnInit(): void {
    this.loadTypesAnnonces();
    
    // Vérifier si mode édition
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.annonceId.set(id);
      this.loadAnnonce(id);
    }
  }

  loadTypesAnnonces(): void {
    this.typeAnnonceService.getTypesAnnonces().subscribe();
  }

  loadAnnonce(id: string): void {
    this.annonceService.getAnnonce(id).subscribe({
      next: (annonce) => {
        // Remplir le formulaire
        this.annonceForm.patchValue({
          titre: annonce.titre,
          contenu: annonce.contenu,
          type_annonce_id: annonce.type_annonce.id,
          prix: annonce.prix,
          date_debut: this.stringToNgbDate(annonce.date_debut),
          date_fin: annonce.date_fin ? this.stringToNgbDate(annonce.date_fin) : null
        });

        // Afficher l'image existante
        if (annonce.image_principale) {
          this.imagePreview.set(annonce.image_principale);
        }
      },
      error: (err) => {
        this.toastr.error('Annonce introuvable');
        this.router.navigate(['/annonces']);
      }
    });
  }

  /**
   * Validation personnalisée : date_fin > date_debut
   */
  dateValidator(form: FormGroup) {
    const dateDebut = form.get('date_debut')?.value;
    const dateFin = form.get('date_fin')?.value;

    if (dateDebut && dateFin) {
      const debut = new Date(dateDebut.year, dateDebut.month - 1, dateDebut.day);
      const fin = new Date(dateFin.year, dateFin.month - 1, dateFin.day);

      if (fin <= debut) {
        return { dateFinInvalide: true };
      }
    }

    return null;
  }

  /**
   * Gérer la sélection d'image
   */
  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    // Vérifier le type
    if (!file.type.startsWith('image/')) {
      this.toastr.error('Veuillez sélectionner une image');
      return;
    }

    // Vérifier la taille (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      this.toastr.error('L\'image ne doit pas dépasser 5 MB');
      return;
    }

    this.imageFile.set(file);

    // Preview
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagePreview.set(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  /**
   * Retirer l'image
   */
  retirerImage(): void {
    this.imageFile.set(null);
    this.imagePreview.set(null);
  }

  /**
   * Soumettre le formulaire
   */
  onSubmit(): void {
    if (this.annonceForm.invalid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.annonceForm.controls).forEach(key => {
        this.annonceForm.get(key)?.markAsTouched();
      });
      this.toastr.warning('Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.isSubmitting.set(true);

    const formValue = this.annonceForm.value;
    
    // Convertir les dates NgbDateStruct en ISO string
    const annonceData: CreateAnnonce = {
      titre: formValue.titre,
      contenu: formValue.contenu,
      type_annonce_id: formValue.type_annonce_id,
      prix: formValue.prix || undefined,
      date_debut: this.ngbDateToISO(formValue.date_debut),
      date_fin: formValue.date_fin ? this.ngbDateToISO(formValue.date_fin) : undefined,
      image_principale: this.imageFile() || undefined
    };

    const request = this.isEdit() && this.annonceId()
      ? this.annonceService.updateAnnonce(this.annonceId()!, annonceData)
      : this.annonceService.createAnnonce(annonceData);

    request.subscribe({
      next: (annonce) => {
        this.toastr.success(
          this.isEdit() ? 'Annonce modifiée avec succès' : 'Annonce créée avec succès'
        );
        this.router.navigate(['/annonces', annonce.id]);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.toastr.error('Erreur lors de l\'enregistrement');
        console.error('Erreur:', err);
      }
    });
  }

  /**
   * Convertir NgbDateStruct en ISO string
   */
  ngbDateToISO(date: NgbDateStruct): string {
    const jsDate = new Date(date.year, date.month - 1, date.day);
    return jsDate.toISOString();
  }

  /**
   * Convertir ISO string en NgbDateStruct
   */
  stringToNgbDate(dateString: string): NgbDateStruct {
    const date = new Date(dateString);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate()
    };
  }

  /**
   * Helpers pour les erreurs
   */
  hasError(fieldName: string, errorType: string): boolean {
    const field = this.annonceForm.get(fieldName);
    return !!(field?.touched && field?.hasError(errorType));
  }

  getErrorMessage(fieldName: string): string {
    const field = this.annonceForm.get(fieldName);
    if (!field?.touched) return '';

    if (field.hasError('required')) return 'Ce champ est obligatoire';
    if (field.hasError('maxlength')) {
      const max = field.errors?.['maxlength'].requiredLength;
      return `Maximum ${max} caractères`;
    }
    if (field.hasError('minlength')) {
      const min = field.errors?.['minlength'].requiredLength;
      return `Minimum ${min} caractères`;
    }
    if (field.hasError('min')) return 'Le prix doit être positif';

    return '';
  }

}
