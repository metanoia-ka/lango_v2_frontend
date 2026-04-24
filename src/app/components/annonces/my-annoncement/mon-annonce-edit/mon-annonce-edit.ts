import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Alert } from '../../../alerts/alert/alert';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AnnonceService } from '../../services/annonce.service';
import { TypeAnnonceService } from '../../services/type-annonce.service';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';
import { Subscription } from 'rxjs';
import { TypeAnnonce } from '../../models/type-annonce.model';
import { CreateAnnonce } from '../../models/annonce.model';

@Component({
  selector: 'app-mon-annonce-edit',
  imports: [CommonModule, ReactiveFormsModule, Alert],
  templateUrl: './mon-annonce-edit.html',
  styleUrl: './mon-annonce-edit.scss'
})
export class MonAnnonceEdit implements OnInit, OnDestroy {

  @Input() annonceId: string | null = null;

  private cdr = inject(ChangeDetectorRef);
  private activeModal = inject(NgbActiveModal);
  private fb = inject(FormBuilder);

  private subscription = new Subscription();
  
  private annonceService = inject(AnnonceService);
  private typeAnonnceService = inject(TypeAnnonceService);
  private confirmation = inject(ConfirmationService);

  annonceForm!: FormGroup;
  selectedFile: File | null = null;

  isLoading = signal(true);
  errorMessage: string | null = null;
  responseType: 'success' | 'danger' = 'success';
  successMessage: string = '';
  isSubmitting = false;

  typeAnnonces: TypeAnnonce[] = [];
  statusChoices = [
    { value: 'DRAFT', label: 'Brouillon' },
    { value: 'PENDING', label: 'En attente de validation' },
    { value: 'ARCHIVED', label: 'Archivé' },
    { value: 'PUBLISHED', label: 'Publié' },
    { value: 'REJECTED', label: 'Rejetée' }
  ];
  
  clearSuccessMessage() {
    this.successMessage = '';
  }
  
  clearErrorMessage() {
    this.errorMessage = '';
  }

  ngOnInit(): void {
    this.loadTypeAnnonces();
    this.loadAnnonce();
    this.initForm();
    this.subscribeToTypeAnnonce();
  }

  initForm(): void {
    this.annonceForm = this.fb.group({
      titre: [
        { value: '', disabled: false },
        [Validators.required, Validators.maxLength(30)]
      ],
      contenu: [''],
      type_annonce_id: ['', Validators.required],
      date_debut: [''],
      date_fin: [''],
      prix: ['', Validators.required],
      image_principale: [null],
    });
  }

  private subscribeToTypeAnnonce(): void {
    this.isLoading.set(true);
    this.subscription.add(
      this.typeAnonnceService.typeAnnonces$.subscribe({
        next: (data) => {
          this.typeAnnonces = data;
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage = `Erreur lors du chargement des types d'annonce': 
            ${err.message || err.statusText}`;
          this.responseType = 'danger';
          this.isLoading.set(false);
        }
      })
    );
  }

  private loadTypeAnnonces(): void {
    this.typeAnonnceService.fetchTypeAnnonces();
  }

  private loadAnnonce(): void {
    this.isLoading.set(true);
    this.errorMessage = '';
    this.subscription.add(
      this.annonceService.getAnnonce(this.annonceId!).subscribe({
        next: (annonce) => {
          this.annonceForm.patchValue({
            titre: annonce.titre,
            contenu: annonce.contenu,
            type_annonce_id: annonce.type_annonce.id,
            statut: annonce.statut,
            prix: annonce.prix,
            image_principale: annonce.image_principale,
            date_debut: this.formatDateForInput(annonce.date_debut),
            date_fin: this.formatDateForInput(annonce.date_fin!)
          });
          this.isLoading.set(false);
        },
        error: (err) => {
          this.errorMessage = `Erreur lors du chargement des annonces': 
            ${err.message || err.statusText}`;
          this.responseType = 'danger';
          this.isLoading.set(false);
        }
      })
    );
  }

  private formatDateForInput(dateString: string | null): string | null {
    if (!dateString) return null;
    const dated = new Date(dateString);
    const offset = dated.getTimezoneOffset();
    const localDate = new Date(dated.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split('T')[0];
  }

  onFileChange(event: any): void {
    const file = event.target.files[0] || null;
    this.selectedFile = file;

    this.annonceForm.patchValue({ image_principale: file });
    this.annonceForm.get('image_principale')?.updateValueAndValidity();
  }

  onSubmit(event?: Event): void {
  
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
  
    if (this.annonceForm.invalid) {
      this.errorMessage = 'Veuillez remplir tous les champs requis.';
      this.annonceForm.markAllAsTouched();
      return;
    }
  
    this.isLoading.set(true);
    this.isSubmitting = true;
  
    const payload = this.annonceForm.getRawValue();
  
    const createPayload: CreateAnnonce = {
      ...payload,
      image_principale: this.selectedFile || undefined,
    };
  
    this.subscription.add(
      this.annonceService.updateAnnonce(
        this.annonceId!, createPayload as Partial<CreateAnnonce>
      ).subscribe({
      next: (res) => {
        this.successMessage = '🎉 Annonce mise à jour avec succès !';
        this.responseType = 'success';
        console.log('Détail du statut:', JSON.stringify(res.statut));
        this.isSubmitting = false;
        this.isLoading.set(false);
        this.cdr.detectChanges();
  
        setTimeout(() => {
          this.activeModal.close('updated');
        }, 1500);
      },
      error: (err) => {
        this.errorMessage = `Erreur lors de la mise à jour de l\'annonce: 
        (status: ${err.status}) -> (message: ${err.statusText})`;
        this.responseType = 'danger';
        this.isLoading.set(false);
        this.cdr.detectChanges();
      }
    }));
  }

  onCancel(): void {
    this.activeModal.dismiss();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

}
