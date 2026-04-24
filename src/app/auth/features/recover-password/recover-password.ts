import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Authentication } from '../../core/authentication';
import { Router, RouterModule } from '@angular/router';
import { matchPasswords } from '../../validators/validators';
import { Alert } from '../../../components/alerts/alert/alert';

@Component({
  selector: 'app-recover-password',
  imports: [CommonModule, ReactiveFormsModule, Alert, RouterModule],
  templateUrl: './recover-password.html',
  styleUrl: './recover-password.scss'
})
export class RecoverPassword {

  private auth = inject(Authentication)
  private fb = inject(FormBuilder);
  private router = inject(Router);

  step = 1; // 1: Identifier, 2: Answer & New Pwd
  errorMessage: string | null = null;
  secretQuestion: string | null = null;
  identifierValidated: string = '';

  messageRedirecting: string = '';
  responseType: 'success' | 'danger' = 'success';
  successMessage: string = '';

  // Formulaire Étape 1
  step1Form = this.fb.group({
    identifier: ['', Validators.required]
  });

  // Formulaire Étape 2
  step2Form = this.fb.group({
    secret_answer: ['', Validators.required],
    new_password: ['', [Validators.required, Validators.minLength(6)]],
    confirm_password: ['', Validators.required]
  }, { validators: matchPasswords });

  clearSuccessMessage() {
    this.successMessage = '';
  }

  clearErrorMessage() {
    this.errorMessage = '';
  }

  // Étape 1 : Récupérer la question
  onStep1Submit() {
    if (this.step1Form.invalid) return;
    const id = this.step1Form.value.identifier!;

    this.auth.recoverPassword({ identifier: id }).subscribe({
      next: (res) => {
        this.secretQuestion = res.secret_question;
        this.identifierValidated = id;
        this.step = 2;
        this.errorMessage = null;
      },
      error: (err) => this.errorMessage = err.error?.error || "Utilisateur introuvable."
    });
  }

  // Étape 2 : Confirmer et reset
  onStep2Submit() {
    if (this.step2Form.invalid) return;

    const payload = {
      identifier: this.identifierValidated,
      secret_answer: this.step2Form.value.secret_answer!,
      new_password: this.step2Form.value.new_password!,
      confirm_password: this.step2Form.value.confirm_password!
    };

    this.auth.recoverPasswordConfirm(payload).subscribe({
      next: () => {
        this.successMessage = '✅ Mot de passe réinitialisé avec succès !';
        this.router.navigate(['/auth/login']);
      },
      error: (err) => this.errorMessage = err.error?.error || "Réponse incorrecte."
    });
  }
}
