import { CommonModule } from '@angular/common';
import {
  Component, inject, OnInit, OnDestroy,
  PLATFORM_ID, signal, computed
} from '@angular/core';
import {
  FormBuilder, FormGroup, ReactiveFormsModule, Validators
} from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MessagingService } from '../services/messaging';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Authentication } from '../../../auth/core/authentication';

const FORMATS_AUTORISES = ['image/jpeg', 'image/png', 'application/pdf'];
const TAILLE_MAX        = 200 * 1024; // 200 Ko

// ── Traduction des clés d'erreur Django → messages lisibles ───────────────────
const ERREURS_UX: Record<string, string> = {
  sender_email:     'Adresse email invalide ou manquante.',
  sender_nom:       'Votre nom est requis.',
  objet:            'L\'objet du message est requis.',
  contenu:          'Le contenu du message est requis.',
  piece_jointe:     'Le fichier joint est invalide ou trop volumineux.',
  non_field_errors: 'Vérifiez vos informations et réessayez.',
};

@Component({
  selector: 'app-messaging-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './messaging-form.html',
  styleUrl:    './messaging-form.scss'
})
export class MessagingForm implements OnInit, OnDestroy {

  private fb          = inject(FormBuilder);
  private svc         = inject(MessagingService);
  private auth        = inject(Authentication);
  private activeModal = inject(NgbActiveModal);
  private destroy$    = new Subject<void>();
 
  form!:      FormGroup;
  submitting  = signal(false);
  submitted   = signal(false);
  erreurs     = signal<string[]>([]);   // liste de messages UX lisibles
  fichierInfo = signal<{ nom: string; taille: string } | null>(null);
  fichierErr  = signal<string | null>(null);
 
  private selectedFile: File | null = null;
 
  // ── Compteurs réactifs ────────────────────────────────────────────────────
  objetCount      = signal(0);
  contenuCount    = signal(0);
  objetRestants   = computed(() => this.OBJET_MAX   - this.objetCount());
  contenuRestants = computed(() => this.CONTENU_MAX - this.contenuCount());
 
  // ── User connecté ─────────────────────────────────────────────────────────
  private get userConnecte(): { identifiant: string; nom: string } | null {
    const user = this.auth.currentUserSignal();
    if (!user) return null;
    // username peut être un pseudo, pas un email — le backend résout le vrai email
    const identifiant = (user as any).email || user.username || '';
    const nom = `${(user as any).first_name ?? ''} ${(user as any).last_name ?? ''}`.trim()
                || user.username || '';
    return { identifiant, nom };
  }
 
  readonly estUserConnecte = computed(() => !!this.auth.currentUserSignal());
  readonly OBJET_MAX       = 200;
  readonly CONTENU_MAX     = 5000;
 
  ngOnInit(): void {
    const user = this.userConnecte;
 
    this.form = this.fb.group({
      // User connecté → champ désactivé, valeur ignorée par le backend
      // Visiteur → champ requis avec validation email
      sender_email: [
        user?.identifiant ?? '',
        user ? [] : [Validators.required, Validators.email]
      ],
      sender_nom: [
        user?.nom ?? '',
        user ? [] : [Validators.required, Validators.minLength(2)]
      ],
      objet:   ['', 
        [
          Validators.required, Validators.minLength(3), 
          Validators.maxLength(this.OBJET_MAX)
        ]],
      contenu: ['', [
        Validators.required, Validators.minLength(10), 
        Validators.maxLength(this.CONTENU_MAX)]
      ],
    });
 
    if (user) {
      this.form.get('sender_email')?.disable();
      this.form.get('sender_nom')?.disable();
    }
 
    // Compteurs temps réel
    this.form.get('objet')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((v: string) => this.objetCount.set(v?.length ?? 0));
 
    this.form.get('contenu')!.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((v: string) => this.contenuCount.set(v?.length ?? 0));
  }
 
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
 
  // ── Gestion fichier ───────────────────────────────────────────────────────
  onFichier(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0] ?? null;
    this.fichierErr.set(null);
    this.fichierInfo.set(null);
    this.selectedFile = null;
 
    if (!file) return;
 
    if (file.size > TAILLE_MAX) {
      this.fichierErr.set(
        `Ce fichier est trop volumineux (${(file.size / 1024).toFixed(0)} Ko). 
        Maximum autorisé : 200 Ko.`
      );
      input.value = '';
      return;
    }
 
    if (!FORMATS_AUTORISES.includes(file.type)) {
      this.fichierErr.set(
        'Ce format n\'est pas accepté. Utilisez un fichier JPG, PNG ou PDF.'
      );
      input.value = '';
      return;
    }
 
    this.selectedFile = file;
    this.fichierInfo.set({
      nom:    file.name,
      taille: file.size < 1024 ? `${file.size} o` : `${(file.size / 1024).toFixed(1)} Ko`,
    });
  }
 
  retirerFichier(input: HTMLInputElement): void {
    this.selectedFile = null;
    this.fichierInfo.set(null);
    this.fichierErr.set(null);
    input.value = '';
  }
 
  // ── Soumission ────────────────────────────────────────────────────────────
  soumettre(): void {
    if (this.form.invalid || this.submitting()) return;
 
    this.submitting.set(true);
    this.erreurs.set([]);
 
    const raw = this.form.getRawValue(); // inclut les champs disabled
 
    this.svc.envoyer({
      sender_email: raw.sender_email,
      sender_nom:   raw.sender_nom,
      objet:        raw.objet,
      contenu:      raw.contenu,
      piece_jointe: this.selectedFile,
    }).subscribe({
      next: () => {
        this.submitted.set(true);
        this.submitting.set(false);
        setTimeout(() => this.activeModal.close('saved'), 2500);
      },
      error: (err) => {
        this.submitting.set(false);
        this.erreurs.set(this._parseErreurs(err));
      }
    });
  }
 
  // ── Conversion erreurs backend → messages UX humains ─────────────────────
  private _parseErreurs(err: any): string[] {
    // Erreur réseau
    if (err.status === 0) {
      return ['Impossible de contacter le serveur. Vérifiez votre connexion internet.'];
    }
    // Trop de requêtes
    if (err.status === 429) {
      return ['Vous avez envoyé trop de messages récemment. Veuillez patienter quelques minutes.'];
    }
    // Erreur serveur
    if (err.status >= 500) {
      return ['Une erreur technique est survenue. Veuillez réessayer dans quelques instants.'];
    }
 
    const detail = err.error;
    if (!detail) {
      return ['Une erreur inattendue est survenue. Veuillez réessayer.'];
    }
 
    // Erreur string directe
    if (typeof detail === 'string') {
      return [detail];
    }
 
    // Objet champ → erreurs
    if (typeof detail === 'object') {
      const messages: string[] = [];
 
      for (const [champ, valeurs] of Object.entries(detail)) {
        if (champ === 'status_code') continue; // ignorer le code HTTP dupliqué
 
        if (champ === 'detail') {
          // Message direct du backend (ex: permission denied)
          messages.push(String(Array.isArray(valeurs) ? valeurs[0] : valeurs));
          continue;
        }
 
        // Utiliser la traduction UX si disponible, sinon message générique
        const msgUx = ERREURS_UX[champ];
        if (msgUx) {
          messages.push(msgUx);
        }
        // On n'affiche PAS les clés techniques inconnues — trop développeur
      }
 
      return messages.length > 0
        ? messages
        : ['Vérifiez vos informations et réessayez.'];
    }
 
    return ['Une erreur inattendue est survenue. Veuillez réessayer.'];
  }
 
  onCancel(): void { this.activeModal.dismiss(); }
 
  recommencer(): void {
    this.submitted.set(false);
    this.form.reset();
    this.selectedFile = null;
    this.fichierInfo.set(null);
    this.fichierErr.set(null);
    this.erreurs.set([]);
    this.objetCount.set(0);
    this.contenuCount.set(0);
  }
 
  isInvalid(ctrl: string): boolean {
    const c = this.form.get(ctrl);
    return !!(c?.invalid && c?.touched);
  }
 
  getError(ctrl: string): string {
    const c = this.form.get(ctrl);
    if (!c?.errors) return '';
    if (c.errors['required'])  return 'Ce champ est requis.';
    if (c.errors['email'])     
      return 'Saisissez une adresse email valide (ex: vous@exemple.com).';
    if (c.errors['minlength']) 
      return `Minimum ${c.errors['minlength'].requiredLength} caractères.`;
    if (c.errors['maxlength']) 
      return `Maximum ${c.errors['maxlength'].requiredLength} caractères.`;
    return 'Valeur invalide.';
  }
}