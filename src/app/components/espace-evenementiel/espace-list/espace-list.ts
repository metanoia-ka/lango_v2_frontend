import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { EspaceEvenementielService } from '../services/espace-evenementiel';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { 
  EspaceEvenementielFilter, 
  EspaceEvenementielList, 
  TypeEspace 
} from '../models/espace-evenementiel.model';

@Component({
  selector: 'app-espace-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './espace-list.html',
  styleUrl: './espace-list.scss'
})
export class EspaceList implements OnInit, OnDestroy {

  private router = inject(Router);

  private readonly service = inject(EspaceEvenementielService);
  private readonly destroy$ = new Subject<void>();
  private readonly search$ = new Subject<string>();

  // ── State ────────────────────────────────────────────────────────────────
  espaces = signal<EspaceEvenementielList[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  readonly typeOptions: { value: TypeEspace | ''; label: string }[] = [
    { value: '', label: 'Tous les types' },
    { value: 'SALLE_FETES', label: 'Salle des fêtes' },
    { value: 'SALLE_CONFERENCE', label: 'Salle de conférences' },
    { value: 'SALLE_MARIAGE', label: 'Salle de mariage / réception' },
    { value: 'SALLE_REUNION', label: 'Salle de réunion / coworking' },
    { value: 'PLEIN_AIR', label: 'Espace plein air / jardin' },
    { value: 'RESTAURANT', label: 'Restaurant privatisable' },
    { value: 'STUDIO', label: 'Studio photo / vidéo' },
    { value: 'TERRAIN_SPORT', label: 'Terrain de sport' },
    { value: 'AUTRE', label: 'Autre espace' },
  ];

  // ── Lifecycle ────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadEspaces();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data ─────────────────────────────────────────────────────────────────

  loadEspaces(): void {
    this.loading.set(true);
    this.error.set(null);


    this.service
      .getList()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.espaces.set(res.results);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger les espaces. Veuillez réessayer.');
          this.loading.set(false);
        },
      });
  }

  // ── Utils ────────────────────────────────────────────────────────────────

  formatPrix(prix: number | null): string {
    if (prix === null) return 'Prix non renseigné';
    return new Intl.NumberFormat('fr-FR').format(prix) + ' FCFA';
  }

  onCreateEspace(): void {
    this.router.navigate(['/lango/evenementiel/espaces/nouveau']);
  }

}
