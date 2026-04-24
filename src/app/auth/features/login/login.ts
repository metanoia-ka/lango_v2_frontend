import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Authentication } from '../../core/authentication';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent implements OnInit {

  isLoading: boolean = false;
  isSubmitting: boolean = false;
  showPassword = false;

  messageRedirecting: string = '';
  error          = signal('');
  success        = signal('');

  private fb = inject(FormBuilder);
  private auth = inject(Authentication);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loginForm!: FormGroup;

  private initForm(): void {
    this.loginForm = this.fb.group({
      identifier: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    this.initForm();
  }

  onRegister(): void {
    this.router.navigate(['auth/register']);
  }

  onLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.isSubmitting = true;
    this.auth.login({
      identifier: this.loginForm.value.identifier,
      password: this.loginForm.value.password
    }).subscribe({
      next: (user) => {
        this.success.set(`Bienvenue ${user.username || user.phone} !`);
        this.isLoading = false;
        this.isSubmitting = false;

        const redirect = this.auth.getRedirectAfterLogin(this.route);

        setTimeout(() => {
          localStorage.removeItem('last_route');
          this.router.navigateByUrl(redirect);
        }, 700);
      },
      error: (err) => {
        const msg = err?.error?.detail 
          ?? `L'un des champs suivants est incorrect: 
              Nom d'utilisateur ou numéro de téléphone ou mot de passe incorrect.`;
        this.error.set(`❌ Erreur lors de la connexion: ${msg}`);
        this.isLoading = false;
        this.isSubmitting = false;
        this.loginForm.get('password')?.reset();
      }
    });
  }
}