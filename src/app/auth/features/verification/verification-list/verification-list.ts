import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { VerificationPersonne, VerificationStats } from '../models/personne-verification';
import { Subscription } from 'rxjs';
import { SVerification } from '../service/verification';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { VerificationDetail } from '../verification-detail/verification-detail';
import { NgbModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-verification-list',
  imports: [CommonModule, FormsModule, RouterModule, NgbTooltipModule],
  templateUrl: './verification-list.html',
  styleUrl: './verification-list.scss',
  providers: [DatePipe]
})
export class VerificationList implements OnInit, OnDestroy {

  errorMessage   = '';
  successMessage = '';

  filters = {
    statut:        '',
    type_personne: '',
    search:        '',
    avec_preuve:   false as boolean,
  };

  private subscription = new Subscription();
  private verifService = inject(SVerification);
  private modalService = inject(NgbModal);

  // Signaux exposés par le service (évite la duplication d'état)
  personnes  = this.verifService.personnes;
  stats      = this.verifService.stats;
  isLoading  = this.verifService.isLoading;

  clearSuccessMessage(): void { this.successMessage = ''; }
  clearErrorMessage():   void { this.errorMessage = ''; }

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this._loadStats();
    this._loadPersonnes();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // ── Chargement ────────────────────────────────────────────────────────────────

  protected _loadPersonnes(): void {
    const params = {
      ...this.filters,
      avec_preuve: this.filters.avec_preuve ? 'true' : undefined,
    };
    this.subscription.add(
      this.verifService.getVerifications(params).subscribe({
        error: err => {
          this.errorMessage = `Erreur chargement (${err.status}) : ${err.statusText}`;
        }
      })
    );
  }

  private _loadStats(): void {
    this.subscription.add(
      this.verifService.getStatistiques().subscribe()
    );
  }

  // ── Filtres ───────────────────────────────────────────────────────────────────

  applyFilters():  void { this._loadPersonnes(); }

  resetFilters(): void {
    this.filters = { statut: '', type_personne: '', search: '', avec_preuve: false };
    this._loadPersonnes();
  }

  // ── Modale détail ─────────────────────────────────────────────────────────────

  openDetail(personne: VerificationPersonne): void {
    const ref = this.modalService.open(VerificationDetail, {
      size: 'lg', centered: true, backdrop: 'static', keyboard: true
    });
    ref.componentInstance.personne = personne;

    ref.result.then(
      result => {
        if (result === 'action_performed') {
          this._loadPersonnes();
          this._loadStats();
        }
      },
      () => {}
    );
  }

  // ── Aperçu preuve (nouvelle fenêtre) ─────────────────────────────────────────

  previewPreuve(personne: VerificationPersonne): void {
    if (!personne.preuve_legale_url) return;

    this.verifService.loadProtectedFileAsBlob(personne.preuve_legale_url)
      .subscribe(safeUrl => {
        if (!safeUrl) {
          this.errorMessage = 'Impossible de charger la preuve.';
          return;
        }
        // Extraire l'URL réelle depuis SafeResourceUrl
        const raw = (safeUrl as any).changingThisBreaksApplicationSecurity as string;
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(
            `<html><body style="margin:0">
              <iframe src="${raw}" width="100%" height="100%"
                      style="border:none;position:absolute;top:0;left:0">
              </iframe>
             </body></html>`
          );
        }
      });
  }

  // ── Helpers UI ────────────────────────────────────────────────────────────────

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      EN_ATTENTE: 'bi-clock-history',
      VALIDE:     'bi-check-circle-fill',
      REJETE:     'bi-x-circle-fill',
      EN_COURS:   'bi-hourglass-split',
      A_CORRIGER: 'bi-exclamation-triangle-fill',
    };
    return icons[status] ?? 'bi-info-circle';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      EN_ATTENTE: 'En attente',
      VALIDE:     'Validé',
      REJETE:     'Rejeté',
      EN_COURS:   'En cours',
      A_CORRIGER: 'À corriger',
    };
    return labels[status] ?? status;
  }
}
