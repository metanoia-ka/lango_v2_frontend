import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NewsletterService } from '../services/newsletter.service';
import { ToastService } from '../../../services/toast.service';
import { AbonneEntry, FollowEntry } from '../models/newsletter.model';
import { RelativeTimePipe } from '../../../pipe/relative-time.pipe';

@Component({
  selector: 'app-mes-follows',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, RelativeTimePipe],
  templateUrl: './mes-follows.html',
  styleUrl: './mes-follows.scss'
})
export class MesFollows implements OnInit {

  private newsletterSvc = inject(NewsletterService);
  private toast         = inject(ToastService);

  // ── État ──────────────────────────────────────────────────────────────────
  onglet        = signal<'follows' | 'abonnes'>('follows');
  loading       = signal(false);
  actionLoading = signal<string | null>(null);  // auteur_id en cours de toggle

  follows  = signal<FollowEntry[]>([]);
  abonnes  = signal<AbonneEntry[]>([]);

  totalFollows  = computed(() => this.follows().length);
  totalAbonnes  = computed(() => this.abonnes().length);

  // Recherche locale
  recherche = signal('');

  followsFiltres = computed(() => {
    const q = this.recherche().toLowerCase();
    return q
      ? this.follows().filter(f => f.username.toLowerCase().includes(q))
      : this.follows();
  });

  abonnesFiltres = computed(() => {
    const q = this.recherche().toLowerCase();
    return q
      ? this.abonnes().filter(a => a.username.toLowerCase().includes(q))
      : this.abonnes();
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.chargerTout();
  }

  chargerTout(): void {
    this.loading.set(true);
    this.newsletterSvc.getMesFollows().subscribe({
      next: res => {
        this.follows.set(res.follows);
        this.newsletterSvc.getMesAbonnes().subscribe({
          next: res2 => {
            this.abonnes.set(res2.abonnes);
            this.loading.set(false);
          },
          error: () => this.loading.set(false)
        });
      },
      error: () => this.loading.set(false)
    });
  }

  changerOnglet(t: 'follows' | 'abonnes'): void {
    this.onglet.set(t);
    this.recherche.set('');
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  nePlusSuivre(auteurId: string, username: string): void {
    this.actionLoading.set(auteurId);
    this.newsletterSvc.nePlusSuivreAuteur(auteurId).subscribe({
      next: () => {
        this.follows.update(l => l.filter(f => f.auteur_id !== auteurId));
        this.toast.showInfo(`Vous ne suivez plus @${username}.`);
        this.actionLoading.set(null);
      },
      error: () => this.actionLoading.set(null)
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  }

  getInitiales(username: string): string {
    return username.charAt(0).toUpperCase();
  }

  getAvatarColor(username: string): string {
    const colors = [
      '#008753','#3C3489','#B45309','#1D4ED8',
      '#7C3AED','#DC2626','#0891B2','#059669',
    ];
    let hash = 0;
    for (const c of username) hash = c.charCodeAt(0) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

}
