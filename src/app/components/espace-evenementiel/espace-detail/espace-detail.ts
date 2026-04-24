import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { EspaceEvenementielService } from '../services/espace-evenementiel';
import { Subject, takeUntil } from 'rxjs';
import { EspaceEvenementielDetail, PhotoEspace, TarifEspace } from '../models/espace-evenementiel.model';

@Component({
  selector: 'app-espace-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './espace-detail.html',
  styleUrl: './espace-detail.scss'
})
export class EspaceDetail implements OnInit, OnDestroy {

  private readonly service = inject(EspaceEvenementielService);
  private readonly route = inject(ActivatedRoute);
  private router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  espace = signal<EspaceEvenementielDetail | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // Galerie
  activePhotoIndex = signal(0);

  // ── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Identifiant invalide.');
      this.loading.set(false);
      return;
    }
    this.loadEspace(id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data ─────────────────────────────────────────────────────────────────

  loadEspace(id: string): void {
    this.service
      .getById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.espace.set(data);
          // Photo principale en premier
          const principaleIdx = data.photos.findIndex(p => p.est_principale);
          if (principaleIdx > 0) this.activePhotoIndex.set(principaleIdx);
          this.loading.set(false);
        },
        error: () => {
          this.error.set("Impossible de charger cet espace. Vérifiez votre connexion.");
          this.loading.set(false);
        }
      });
  }

  // ── Galerie ──────────────────────────────────────────────────────────────

  setActivePhoto(index: number): void {
    this.activePhotoIndex.set(index);
  }

  prevPhoto(): void {
    const espace = this.espace();
    if (!espace || espace.photos.length === 0) return;
    const prev = (this.activePhotoIndex() - 1 + espace.photos.length) % espace.photos.length;
    this.activePhotoIndex.set(prev);
  }

  nextPhoto(): void {
    const espace = this.espace();
    if (!espace || espace.photos.length === 0) return;
    const next = (this.activePhotoIndex() + 1) % espace.photos.length;
    this.activePhotoIndex.set(next);
  }

  activePhoto(): PhotoEspace | null {
    const espace = this.espace();
    if (!espace || espace.photos.length === 0) return null;
    return espace.photos[this.activePhotoIndex()];
  }

  // ── Utils ────────────────────────────────────────────────────────────────

  formatPrix(prix: number | null, unite?: string): string {
    if (prix === null) return '—';
    const montant = new Intl.NumberFormat('fr-FR').format(prix) + ' FCFA';
    return unite ? `${montant} / ${unite}` : montant;
  }

  tarifPrincipal(): TarifEspace | null {
    const espace = this.espace();
    if (!espace) return null;
    const actifs = espace.tarifs;
    if (!actifs.length) return null;
    const prio: Record<string, number> = { 
      HEURE: 1, DEMI_J: 2, JOURNEE: 3, WEEKEND: 4, SEMAINE: 5, MOIS: 6 
    };
    return actifs.slice().sort((a, b) => (prio[a.unite] ?? 9) - (prio[b.unite] ?? 9))[0];
  }

  proprioNom(): string {
    const e = this.espace();
    if (!e) return '';
    const { first_name, last_name, username } = e.proprietaire;
    return (first_name && last_name) ? `${first_name} ${last_name}` : username;
  }

  onBack(): void {
    this.router.navigate(['/lango/evenementiel/espaces']);
  }

}
