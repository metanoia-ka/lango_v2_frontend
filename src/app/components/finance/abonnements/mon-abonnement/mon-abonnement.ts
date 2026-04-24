import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { AbonnementService } from '../../services/abonnement';

@Component({
  selector: 'app-mon-abonnement',
  imports: [CommonModule, RouterModule, NgbTooltipModule, DecimalPipe],
  templateUrl: './mon-abonnement.html',
  styleUrl: './mon-abonnement.scss'
})
export class MonAbonnement implements OnInit {

  private aboSvc = inject(AbonnementService);

  abonnement  = this.aboSvc.abonnement;
  isLoading   = this.aboSvc.isLoading;
  onglet      = signal<'apercu' | 'historique'>('apercu');

  quotaEpuise = computed(() => {
    const abo = this.abonnement();
    if (!abo || abo.plan_detail.est_illimite) return false;
    return abo.quota_annonces_restant === 0;
  });

  quotaAlerte = computed(() => {
    const abo = this.abonnement();
    if (!abo || abo.plan_detail.est_illimite) return false;
    // Alerte dès 80% consommé
    return this.quotaPct >= 80 && abo.quota_annonces_restant > 0;
  });

  ngOnInit(): void {
    this.aboSvc.getMonAbonnement().subscribe({ error: () => {} });
  }

  changerOnglet(t: 'apercu' | 'historique'): void {
    this.onglet.set(t);
  }

  // Pourcentage quota consommé
  get quotaPct(): number {
    const abo = this.abonnement();
    if (!abo || abo.plan_detail.est_illimite) return 0;
    const consomme = abo.quota_annonces_total - abo.quota_annonces_restant;
    return Math.round((consomme / abo.quota_annonces_total) * 100);
  }

  get quotaColor(): string {
    const pct = this.quotaPct;
    if (pct >= 90) return '#ef4444';
    if (pct >= 70) return '#f59e0b';
    return '#10b981';
  }

  getNiveauColor    = (n: string) => this.aboSvc.getNiveauColor(n);
  getNiveauBg       = (n: string) => this.aboSvc.getNiveauBg(n);
  getStatutClass    = (s: string) => this.aboSvc.getStatutClass(s);

}
