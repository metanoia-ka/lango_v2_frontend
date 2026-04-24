import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { 
  FormBuilder, FormGroup, 
  ReactiveFormsModule, Validators 
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { matchPasswords, uniqueFieldValidator } from '../../validators/validators';
import { NgbProgressbarModule } from '@ng-bootstrap/ng-bootstrap';
import { Authentication } from '../../core/authentication';
import { TypePersonne } from '../models/user-modif.model';
import { debounceTime, distinctUntilChanged, of } from 'rxjs';

@Component({
  selector: 'app-register-purchaser',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NgbProgressbarModule],
  templateUrl: './register-purchaser.html',
  styleUrl: './register-purchaser.scss'
})
export class RegisterPurchaser implements OnInit {
  
  registerForm!: FormGroup;
  passwordStrength = { level: '', color: 'danger', value: 0 };

  isLoading: boolean = false;
  isSubmitting: boolean = false;

  messageRedirecting: string = '';
  error          = signal('');
  success        = signal('');

  selectedType: TypePersonne = TypePersonne.PHYSIQUE;
  TypePersonne = TypePersonne;

  private fb = inject(FormBuilder);
  private auth = inject(Authentication);
  private router = inject(Router);

  private initRegistrationForm(): void {
    this.registerForm = this.fb.group(
      {
        username: [
          '',
          [
            Validators.required, 
            Validators.minLength(3),
            Validators.maxLength(100)
          ],
          [uniqueFieldValidator(this.auth, 'username')],
        ],
        phone: [
          '',
          [Validators.required, Validators.pattern(/^\+?[0-9]{8,15}$/)],
          [uniqueFieldValidator(this.auth, 'phone')]
        ],
        password: ['', [
          Validators.required,
          Validators.minLength(10)
        ]],
        confirm_password: ['', Validators.required],
        secret_question: ['', [Validators.required, Validators.maxLength(255)]],
        secret_answer: ['', [Validators.required, Validators.maxLength(255)]],
        
        type_personne: [TypePersonne.PHYSIQUE, Validators.required],
      
        nom: ['', Validators.required],
        prenom: [''],
        sigle: [''],
        adresse: [''],
        email: ['', Validators.email],
      
        cin: [''],
        profession: [''],
      
        numero_registre: [''],
      
        preuve_legale: [null]
      }, 
      { validators: matchPasswords }
    );

    this.registerForm.get('password')?.valueChanges.subscribe((pwd) => {
      this.passwordStrength = this.evaluatePasswordStrength(pwd);
    });
  }

  ngOnInit(): void {
    this.initRegistrationForm();
    this.setupAsyncValidators();
    this.setupTypePersonneWatcher()
  }

  setupAsyncValidators(): void {
    // Déclencher la validation après un délai
    this.registerForm.get('username')?.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe();

    this.registerForm.get('phone')?.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe();
  }

  evaluatePasswordStrength(
    password: string
  ): { level: string; color: string; value: number } {
    if (!password) return { level: '', color: 'danger', value: 0 };

    let score = 0;
    if (password.length >= 8) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 25;
    if (/[^A-Za-z0-9]/.test(password)) score += 25;

    if (score <= 25) return { level: 'Faible', color: 'danger', value: score };
    if (score <= 50) return { level: 'Moyen', color: 'warning', value: score };
    if (score <= 75) return { level: 'Bon', color: 'info', value: score };
    return { level: 'Fort', color: 'success', value: score };
  }

  /**
   * Surveiller les changements de type_personne pour ajuster les validateurs
   */
  setupTypePersonneWatcher(): void {
    this.registerForm.get('type_personne')?.valueChanges.subscribe(type => {
      this.selectedType = type;
      this.updateValidatorsByType(type);
    });
    
    // Initialiser les validateurs
    this.updateValidatorsByType(this.selectedType);
  }

  /**
   * Mettre à jour les validateurs selon le type de personne
   */
  updateValidatorsByType(type: TypePersonne): void {
    const cinControl = this.registerForm.get('cin');
    const numeroRegistreControl = this.registerForm.get('numero_registre');
    const prenomControl = this.registerForm.get('prenom');
    const sigleControl = this.registerForm.get('sigle');
    
    if (type === TypePersonne.PHYSIQUE) {
      // PHYSIQUE : CIN obligatoire
      cinControl?.setValidators([Validators.required]);
      numeroRegistreControl?.clearValidators();
      
      // Réinitialiser les champs MORALE
      sigleControl?.setValue('');
      numeroRegistreControl?.setValue('');
      
    } else if (type === TypePersonne.MORALE) {
      // MORALE : numero_registre obligatoire
      numeroRegistreControl?.setValidators([Validators.required]);
      cinControl?.clearValidators();
      
      // Réinitialiser les champs PHYSIQUE
      prenomControl?.setValue('');
      cinControl?.setValue('');
    }
    
    // Mettre à jour la validité
    cinControl?.updateValueAndValidity();
    numeroRegistreControl?.updateValueAndValidity();
  }

  onConnect(): void {
    this.router.navigate(['/auth/login']);
  }

  onHome(): void {
    this.router.navigate(['/lango/annonces']);
  }

  /**
   * Gestion du changement de fichier (preuve légale)
   */
  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.registerForm.patchValue({
        preuve_legale: file
      });
    }
  }

  onRegister(): void {
    this.success.set('');
    this.error.set('');

    const username = this.registerForm.get('username')?.value;
    const phone = this.registerForm.get('phone')?.value;
    
    if (!username && !phone) {
      this.error.set(`Vous devez renseigner un nom d\'utilisateur 
      ou un numéro de téléphone.`);
      return;
    }

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.isSubmitting = true;

    const formData = this.registerForm.value;

    // Retirer les champs vides
    Object.keys(formData).forEach(key => {
      if (formData[key] === '' || formData[key] === null) {
        delete formData[key];
      }
    });

    this.auth.register(formData)
      .subscribe({
        next: (response) => {
          this.success.set(response.message);
          this.isLoading = false;
          this.isSubmitting = false;
          
          const identifier = formData.username || formData.phone;
          this.auth.login({ identifier, password: formData.password })
            .subscribe({
              next: (response) => {
                this.success.set(`Bienvenue sur Lango Technologie,
                  ${response.username}!
                  Vous allez être redirigé(e) à la page d'accueil.`);
                this.isLoading = false;
                this.isSubmitting = false;
                setTimeout(() => {
                  this.router.navigate(['/lango/home']);
                }, 3000);
              },
              error: (error) => {
                this.error.set(`Une erreur est survenue 
                lors de la connexion au compte. Erreur: ${error.message}`);
                this.isLoading = false;
                this.isSubmitting = false;
                this.router.navigate(['/auth/login'], {
                  queryParams: { registered: 'success' }
                });
              }
            });
        },
        error: (error) => {
          this.isSubmitting = false;

          if (error.error && typeof error.error === 'object') {
            const errors = error.error;
            const errorMessages = Object.keys(errors).map(key => {
              if (Array.isArray(errors[key])) {
                return `${key}: ${errors[key].join(', ')}`;
              }
              return `${key}: ${errors[key]}`;
            });
            this.error.set(errorMessages.join(' | '));
          } else {
            this.error.set(error.error?.message 
            || 'Une erreur est survenue lors de l\'inscription.');
          }
        }
      });
  }

  get f() {
    return this.registerForm.controls;
  }
}
