import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Authentication } from '../../core/authentication';

@Component({
  selector: 'app-change-password',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password.html',
  styleUrl: './change-password.scss'
})
export class ChangePassword {
  
  private auth = inject(Authentication);
  private fb = inject(FormBuilder);

  isLoading = signal(false);

  isSubmitting = signal(false);
  errorMessage: string | null = null;

  responseType: 'success' | 'error' = 'success';
  successMessage: string = '';

  showOld     = false;
  showNew     = false;
  showConfirm = false;

  success = signal(false);
  error = signal<string | null>(null);

  form = this.fb.group({
    oldPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmNewPassword: ['', Validators.required],
  }, { validators: this.passwordsMatch });

  clearSuccessMessage() {
    this.successMessage = '';
  }

  clearErrorMessage() {
    this.errorMessage = '';
  }

  passwordsMatch(g: any) {
    return g.get('newPassword')?.value === g.get('confirmNewPassword')?.value
      ? null : { mismatch: true };
  }

  get pwdStrength(): number {
    const val = this.form.get('newPassword')?.value ?? '';
    if (!val) return 0;
    let score = 0;
    if (val.length >= 8)          score++;
    if (/[A-Z]/.test(val))        score++;
    if (/[0-9]/.test(val))        score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    return score;
  }

  get pwdStrengthLabel(): string {
    const s = this.pwdStrength;
    if (s <= 1) return 'Faible';
    if (s === 2) return 'Moyen';
    return 'Fort';
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.isLoading.set(true);
    this.error.set(null);
    this.success.set(false);

    const data = {
      old_password: this.form.value.oldPassword!,
      new_password: this.form.value.newPassword!,
      confirm_password: this.form.value.confirmNewPassword!
    };

    this.auth.changePassword(data).subscribe({
      next: () => {
        this.success.set(true);
        this.successMessage = 'Mot de passe modifié avec succès !';
        this.isLoading.set(false);
        this.isSubmitting.set(false);
        this.form.reset();
      },
      error: (err) => {
        this.error.set(
          err.status === 400 && err.error?.old_password
            ? 'Ancien mot de passe incorrect'
            : 'Erreur lors du changement'
        );
        this.errorMessage = `❌ Erreur lors du changement: 
              (status: ${err.status}) -> (message: ${err.statusText})`;
        this.isLoading.set(false);
        this.isSubmitting.set(false);
      },
      complete: () => this.isLoading.set(false)
    });
  }
}
