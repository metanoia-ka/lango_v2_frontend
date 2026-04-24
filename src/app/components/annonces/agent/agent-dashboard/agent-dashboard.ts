import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AgentService } from '../services/agent.service';
import { ToastService } from '../../../../services/toast.service';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';
import { Subject, takeUntil } from 'rxjs';
import { AssignationTicket } from '../models/agent.model';

export enum ActionType {
  Approve = 'approve',
  Reject  = 'reject',
  Start   = 'start',
  Visit   =  'visit'
}

@Component({
  selector: 'app-agent-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './agent-dashboard.html',
  styleUrl: './agent-dashboard.scss'
})
export class AgentDashboard implements OnInit, OnDestroy {

  private agentSvc = inject(AgentService);
  private toast = inject(ToastService);
  private confirmation = inject(ConfirmationService);
  private destroy$ = new Subject<void>();

  // Signaux du service
  tickets = this.agentSvc.tickets;
  stats = this.agentSvc.stats;
  isLoading = this.agentSvc.loading;
  
  loading: {
    [ticketId: string]: { [action in ActionType]?: boolean }
  } = {};

  actionsTypes = ActionType;

  // État local
  ongletActif = signal<'attente' | 'en_cours'>('attente');
  ticketActif = signal<AssignationTicket | null>(null);
  actionLoading = signal<string | null>(null);
  loadingActions: Record<string, 'approve' | 'report' | null> = {};
  
  // Formulaire de verdict
  localisationVerifiee = signal('');
  motifSignalement = signal('');
  erreurMotif = signal('');

  // Computed - filtrage des tickets par statut
  ticketsEnAttente = computed(() => 
    this.tickets().filter(t => t.statut === 'EN_ATTENTE')
  );
  
  ticketsEnCours = computed(() => 
    this.tickets().filter(t => t.statut === 'EN_COURS')
  );

  startLoading(ticketId: string, action: ActionType) {
    if (this.loading[ticketId]) {
      this.loading[ticketId] = {};
    }
    this.loading[ticketId][action] = true;
  }

  stopLoading(ticketId: string, action: ActionType) {
    if (this.loading[ticketId]) {
      this.loading[ticketId][action] = false;
    }
  }

  ngOnInit(): void {
    this.chargerDonnees();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  chargerDonnees(): void {
    this.agentSvc.getMesTickets().pipe(takeUntil(this.destroy$)).subscribe({
      error: () => this.toast.showError('Erreur lors du chargement des tickets.')
    });
    
    this.agentSvc.getStats().pipe(takeUntil(this.destroy$)).subscribe({
      error: () => this.toast.showError('Erreur lors du chargement des statistiques.')
    });
  }

  rafraichir(): void {
    this.chargerDonnees();
  }

  ouvrirTicket(ticket: AssignationTicket): void {
    this.ticketActif.set(ticket);
    this.localisationVerifiee.set('');
    this.motifSignalement.set('');
    this.erreurMotif.set('');
  }

  fermerTicket(): void {
    this.ticketActif.set(null);
  }

  isActionLoading(ticketId: string, action: ActionType): boolean {
    return !!this.loading[ticketId]?.[action];
  }

  /**
   * POST /prendre-en-charge/
   */
  prendreEnCharge(ticket: AssignationTicket): void {
    if (ticket.statut !== 'EN_ATTENTE') return;
    
    this.actionLoading.set(ticket.id);
    this.agentSvc.prendreEnCharge(ticket.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (res) => {
        this.toast.showSuccess(res.detail);
        // Mise à jour du ticket actif si ouvert
        if (this.ticketActif()?.id === ticket.id) {
          this.ticketActif.update(t => t ? { ...t, statut: 'EN_COURS' } : null);
        }
        this.actionLoading.set(null);
      },
      error: (e) => {
        this.toast.showError(e.error?.detail ?? 'Erreur lors de la prise en charge.');
        this.actionLoading.set(null);
      }
    });
  }

  /**
   * POST /approuver/
   */
  async approuver(): Promise<void> {
    const ticket = this.ticketActif();
    if (!ticket) return;

    const ok = await this.confirmation.confirm({
      title: 'Approuver cette annonce',
      type: 'bg-success',
      message: `Confirmer que l'annonce « ${ticket.annonce_titre} » est conforme ?`,
      icon: 'bi-check-circle',
      confirmLabel: 'Oui, approuver',
      cancelLabel: 'Annuler',
    });
    
    if (!ok) return;

    this.actionLoading.set(ticket.id);
    this.agentSvc.approuver(ticket.id, this.localisationVerifiee()).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (res) => {
        this.toast.showSuccess(res.detail);
        this.fermerTicket();
        this.chargerDonnees(); // Rafraîchir les stats
        this.actionLoading.set(null);
      },
      error: (e) => {
        this.toast.showError(e.error?.detail ?? 'Erreur lors de l\'approbation.');
        this.actionLoading.set(null);
      }
    });
  }

  /**
   * POST /signaler/
   */
  signaler(): void {
    const ticket = this.ticketActif();
    if (!ticket) return;

    // Validation du motif (obligatoire)
    if (!this.motifSignalement().trim() || this.motifSignalement().trim().length < 10) {
      this.erreurMotif.set('Le motif doit contenir au moins 10 caractères.');
      return;
    }
    this.erreurMotif.set('');

    this.actionLoading.set(ticket.id);
    this.agentSvc.signaler(
      ticket.id, this.motifSignalement(), this.localisationVerifiee()
    ).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (res) => {
        this.toast.showInfo(res.detail);
        this.fermerTicket();
        this.chargerDonnees(); // Rafraîchir les stats
        this.actionLoading.set(null);
      },
      error: (e) => {
        this.toast.showError(e.error?.detail ?? 'Erreur lors du signalement.');
        this.actionLoading.set(null);
      }
    });
  }

  /**
   * Helpers d'affichage
   */
  formatPrix(prix: string | null, typeTransaction: string | null): string {
    if (!prix) return '—';
    const num = parseFloat(prix);
    if (isNaN(num)) return prix;
    
    const formatter = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      maximumFractionDigits: 0
    });
    
    let prixFormate = formatter.format(num);
    if (typeTransaction === 'LOCATION') {
      prixFormate += '/mois';
    }
    return prixFormate;
  }

  getTxLabel(tx: string | null): string {
    const labels: Record<string, string> = {
      'VENTE': 'Vente',
      'LOCATION': 'Location',
      'LOCATION_VENTE': 'Location-vente'
    };
    return tx ? labels[tx] ?? tx : '—';
  }

  getTxClass(tx: string | null): string {
    const classes: Record<string, string> = {
      'VENTE': 'tx--vente',
      'LOCATION': 'tx--location',
      'LOCATION_VENTE': 'tx--lv'
    };
    return tx ? classes[tx] ?? '' : '';
  }
  

}
