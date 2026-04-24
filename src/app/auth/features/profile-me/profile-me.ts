import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Authentication, User } from '../../core/authentication';
import { Router } from '@angular/router';
import { ChangePassword } from "../change-password/change-password";
import { RelativeTimePipe } from '../../../pipe/relative-time.pipe';
import { TypePersonne } from '../../../models/personne.model';
import { Alert } from '../../../components/alerts/alert/alert';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';

export type VerificationUI = {
  label: string;
  message: string;
  icon: string;
  color: string;
  bg: string;
};

@Component({
  selector: 'app-profile-me',
  imports: [
    CommonModule, ReactiveFormsModule, 
    ChangePassword, RelativeTimePipe, Alert,
    RelativeTimePipe
  ],
  templateUrl: './profile-me.html',
  styleUrl: './profile-me.scss'
})
export class ProfileMe implements OnInit {

  private auth = inject(Authentication);

  private router = inject(Router);
  private http = inject(HttpClient)
  private fb = inject(FormBuilder);
  private sanitizer = inject(DomSanitizer);

  profilForm!: FormGroup;
  selectedFile: File | null = null;
  verificationUI: VerificationUI | null = null;

  user = signal<User | null>(null);
  showChangePassword = signal(false);
  showRepresentant = signal(false);

  responseType: 'success' | 'error' | 'info' = 'success';
  successMessage: string = '';
  profile!: any;
  isVerified: boolean = false;
  statutVerification: any;
  commentVerification!: string;

  isSubmitting: boolean = false;
  isLoading = false;
  errorMessage: string = '';

  allowReplace: boolean = false;

  clearSuccessMessage() {
    this.successMessage = '';
  }
  
  clearErrorMessage() {
    this.errorMessage = '';
  }

  personneTypes: TypePersonne[] = ['PHYSIQUE', 'MORALE'];
  preuveLegaleUrl: SafeResourceUrl | null = null;

  constructor() {
    effect(() => {
      const u = this.auth.currentUserValue;
      if (u === null) {
        this.router.navigate(['/auth/login']);
      } else if (u !== undefined) {
        this.user.set(u);
      }
    });
  }

  ngOnInit() {
    this.initForm();
    this.loadDataProfile();
  }

  private initForm(): void {
    this.profilForm = this.fb.group({
      type_personne: ['PHYSIQUE', Validators.required],
      nom: ['', Validators.required],
      prenom: [''],
      sigle: [''],
      cin: [''],
      iuc: [''],
      profession: [''],
      numero_registre: [''],
      adresse: [''],
      telephone: ['', Validators.pattern('^[+]?[0-9]{8,15}$')],
      email: ['', [Validators.email]],
      preuve_legale: [null],
      representant: this.fb.group({
        nom: [''],
        prenom: [''],
        cin: [''],
        profession: [''],
        telephone: ['', Validators.pattern('^[+]?[0-9]{8,15}$')],
        adresse: [''],
        email: ['', [Validators.email]],
        numero_registre: [''],
        preuve_legale: ['']
      })
    });
  }

  private loadDataProfile(): void {
    this.isLoading = true;

    this.auth.loadMeFull().subscribe({
      next: (res) => {
        // USER
        this.user.set(res.user);

        // PROFIL
        this.profilForm.patchValue(res.profil);

        if (res.profil.type_personne === 'MORALE' && res.profil.representant) {
          this.showRepresentant.set(true);
          this.profilForm.get('representant')?.patchValue(res.profil.representant);
        }

        // PREUVE LEGALE
        if (res.profil.preuve_legale_url) {
          this.loadPreuveLegaleUrl(res)
        }

        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger le profil';
        this.isLoading = false;
      }
    });
  }

  private loadPreuveLegaleUrl(res: any): void {
    this.http.get(
      res.profil.preuve_legale_url, { responseType: 'blob' }
    ).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.preuveLegaleUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.profile = res.profil;
        this.verificationUI = this.getVerificationUI(res.profil.statut_verification);
        this.isVerified = res.profil.est_verifie;
        this.statutVerification = res.profil.statut_verification;
        this.commentVerification = res.profil.commentaire_verification;
      },
      error: (err) => {
         console.error('Erreur chargement preuve:', err);
      }
    })
  }

  /**
   * ✅ NOUVEAU : Basculer l'affichage du formulaire représentant
   */
  toggleRepresentant(): void {
    this.showRepresentant.update(v => !v);
    
    if (!this.showRepresentant()) {
      this.profilForm.get('representant')?.reset();
    }
  }

  onFileChange(event: any) {
    this.selectedFile = event.target.files[0] || null;
  }

  toggleChangePassword() {
    this.showChangePassword.update(v => !v);
  }

  onPasswordChanged() {
    this.showChangePassword.set(false)
  }

  onSubmit(): void {

    if (this.profilForm.invalid) {
      this.profilForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.isSubmitting = true;

    const formData = new FormData();
    const formValue = this.profilForm.value;

    Object.keys(formValue).forEach(key => {
      if (key === 'representant') {
        
        const representant = formValue[key];
        
        if (this.showRepresentant() && representant) {
          const hasData = Object.values(representant).some(v => v !== null && v !== '');
          
          if (hasData) {
            Object.keys(representant).forEach(repKey => {
              const value = representant[repKey];
              if (value !== null && value !== '') {
                formData.append(`representant.${repKey}`, value);
              }
            });
          }
        }
      } else if (key === 'preuve_legale') {
        // Gérer séparément
      } else {
        const value = formValue[key];
        if (key === 'email' || key === 'telephone') {
          formData.append(key, value || '');
        } else if (value !== null && value !== undefined && value !== '') {
          formData.append(key, value);
        }
      }
    });

    if (this.selectedFile) {
      formData.append('preuve_legale', this.selectedFile);
    }

    this.auth.updateProfileUser(formData).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.isSubmitting = false;

        this.successMessage = response.message || 'Profil mis à jour avec succès';

        setTimeout(() => {
          this.loadDataProfile();
        }, 3000);
      },
      error: (error) => {
        console.error('Erreur complète:', error);
            
        let errorMsg = 'Une erreur est survenue';
        
        if (error.error) {
          if (typeof error.error === 'string') {
            errorMsg = error.error;
          } else if (error.error.message) {
            errorMsg = error.error.message;
          } else if (error.error.detail) {
            errorMsg = error.error.detail;
          } else if (error.error.errors) {
            const errors = error.error.errors;
            const errorList = Object.keys(errors).map(key => {
              const fieldErrors = errors[key];
              if (Array.isArray(fieldErrors)) {
                return `${key}: ${fieldErrors.join(', ')}`;
              }
              return `${key}: ${fieldErrors}`;
            });
            errorMsg = errorList.join(' | ');
          }
        }

        this.errorMessage = errorMsg;
        this.responseType = 'error';
        this.isLoading = false;
        this.isSubmitting = false;
      }
    });
  }

  getVerificationUI(status: string | null | undefined): VerificationUI | null {
    if (!status) return null;

    const map: Record<string, VerificationUI> = {
      EN_ATTENTE: {
        label: 'En attente de vérification',
        message: 'Votre pièce légale a bien été reçue et est en attente de vérification.',
        icon: 'bi-hourglass-split',
        color: 'primary',
        bg: 'bg-secondary-subtle'
      },
      EN_COURS: {
        label: 'En cours de vérification',
        message: 'Votre pièce légale est actuellement en cours de vérification.',
        icon: 'bi-arrow-repeat',
        color: 'primary',
        bg: 'bg-primary-subtle'
      },
      VALIDE: {
        label: 'Validée',
        message: 'Votre pièce légale a été vérifiée et validée avec succès.',
        icon: 'bi-patch-check-fill',
        color: 'success',
        bg: 'bg-success-subtle'
      },
      REJETE: {
        label: 'Rejetée',
        message: `Votre pièce légale a été rejetée 
                  car elle ne respecte pas les critères requis.`,
        icon: 'bi-x-octagon-fill',
        color: 'danger',
        bg: 'bg-danger-subtle'
      },
      A_CORRIGER: {
        label: 'À corriger',
        message: 'Votre pièce légale nécessite des corrections avant validation.',
        icon: 'bi-pencil-square',
        color: 'warning',
        bg: 'bg-warning-subtle'
      }
    };

    return map[status] || map['EN_ATTENTE'];
  }

  logout() {
    this.auth.logout().subscribe();
  }
}
