import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit, OnDestroy, signal } from '@angular/core';
import { VerificationAction, VerificationPersonne } from '../models/personne-verification';
import { SVerification } from '../service/verification';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SafeResourceUrl } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import { Alert } from '../../../../components/alerts/alert/alert';

@Component({
  selector: 'app-verification-detail',
  imports: [CommonModule, RouterModule, FormsModule, Alert],
  templateUrl: './verification-detail.html',
  styleUrl: './verification-detail.scss'
})
export class VerificationDetail implements OnInit, OnDestroy {

  @Input() personne!: VerificationPersonne;

  // ── Signaux internes ──────────────────────────────────────────────────────────
  commentaire       = signal('');
  loading           = signal(false);
  error             = signal<string | null>(null);
  preuveLegaleSafeUrl = signal<SafeResourceUrl | null>(null);
  // Copie locale mise à jour après chaque action
  personneLocale    = signal<VerificationPersonne | null>(null);

  successMessage = '';
  private blobUrl: string | null = null;
  private destroy$ = new Subject<void>();

  private verifService = inject(SVerification);
  private activeModal  = inject(NgbActiveModal);

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.personneLocale.set(this.personne);
    this._chargerPreuve();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Libérer l'URL blob pour éviter les fuites mémoire
    if (this.blobUrl) URL.revokeObjectURL(this.blobUrl);
  }

  // ── Chargement de la preuve ───────────────────────────────────────────────────

  private _chargerPreuve(): void {
    if (!this.personne?.preuve_legale_url) return;

    this.verifService.loadProtectedFileAsBlob(this.personne.preuve_legale_url)
      .pipe(takeUntil(this.destroy$))
      .subscribe(safeUrl => this.preuveLegaleSafeUrl.set(safeUrl));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  get statut(): string {
    return this.personneLocale()?.statut_verification ?? this.personne.statut_verification;
  }

  /** Commentaire obligatoire pour rejet et demande de correction. */
  get commentaireObligatoire(): boolean {
    return this.commentaire().trim().length === 0;
  }

  clearSuccessMessage(): void { this.successMessage = ''; }
  clearError():         void { this.error.set(null); }

  // ── Actions métier ────────────────────────────────────────────────────────────

  valider(): void {
    this._executer(
      this.verifService.valider(this.personne.id, this.commentaire()),
      'Profil validé avec succès.'
    );
  }

  rejeter(): void {
    if (this.commentaireObligatoire) {
      this.error.set('Un commentaire est obligatoire pour rejeter.');
      return;
    }
    this._executer(
      this.verifService.rejeter(this.personne.id, this.commentaire()),
      'Profil rejeté.'
    );
  }

  mettreEnCours(): void {
    this._executer(
      this.verifService.mettreEnCours(this.personne.id),
      'Vérification prise en charge.'
    );
  }

  demanderCorrection(): void {
    if (this.commentaireObligatoire) {
      this.error.set('Précisez ce qui doit être corrigé.');
      return;
    }
    this._executer(
      this.verifService.demanderCorrection(this.personne.id, this.commentaire()),
      'Demande de correction envoyée.'
    );
  }

  private _executer(
    action$: ReturnType<typeof this.verifService.valider>,
    messageSucces: string
  ): void {
    this.loading.set(true);
    this.error.set(null);

    action$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (personneMAJ) => {
        this.loading.set(false);
        this.successMessage = messageSucces;
        // Mettre à jour le statut affiché sans fermer la modale
        this.personneLocale.set(personneMAJ);
        // Fermer après 2.5s pour que l'admin voie la confirmation
        setTimeout(() => this.activeModal.close('action_performed'), 2500);
      },
      error: err => {
        this.loading.set(false);
        const detail = err.error?.detail
          ?? err.error?.commentaire
          ?? err.error?.non_field_errors?.[0]
          ?? 'Une erreur est survenue.';
        this.error.set(detail);
      }
    });
  }

  // ── Téléchargement preuve ─────────────────────────────────────────────────────

  downloadPreuve(): void {
    if (!this.personne?.preuve_legale_url) return;

    this.verifService.downloadPreuve(this.personne.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = `preuve_${this.personne.nom ?? 'anonyme'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      error: err => this.error.set('Erreur téléchargement : ' + err.statusText)
    });
  }

  cancel(): void {
    this.activeModal.dismiss('cancelled');
  }
}
