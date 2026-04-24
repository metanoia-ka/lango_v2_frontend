import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { 
  FormBuilder, 
  FormGroup, 
  FormsModule, 
  ReactiveFormsModule, 
  Validators 
} from '@angular/forms';
import { NgbModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ZoneCompetenceService } from '../services/zone-competence.service';
import { ToastService } from '../../../../services/toast.service';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';
import { Subject, takeUntil } from 'rxjs';
import { 
  AgentResume, 
  ArrondissementResume, 
  BulkCreatePayload, 
  CreateZoneCompetencePayload, 
  ZoneCompetenceAgentList 
} from '../models/zone-competence.model';

type TabType = 'liste' | 'ajout-simple' | 'ajout-multiple';

@Component({
  selector: 'app-zone-competence-agent',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgbTooltipModule],
  templateUrl: './zone-competence-agent.html',
  styleUrl: './zone-competence-agent.scss'
})
export class ZoneCompetenceAgent implements OnInit, OnDestroy {

  private service = inject(ZoneCompetenceService);
  private toast = inject(ToastService);
  private confirmation = inject(ConfirmationService);
  private modalService = inject(NgbModal);
  private fb = inject(FormBuilder);
  private destroy$ = new Subject<void>();
  
  // Signaux du service
  zones = this.service.zones;
  loading = this.service.loading;
  stats = this.service.stats;
  
  // État local
  activeTab = signal<TabType>('liste');
  
  // Filtres
  searchTerm = signal('');
  filterActif = signal<boolean | null>(null);
  filterPriorite = signal<1 | 2 | null>(null);
  
  // Formulaire simple
  zoneForm: FormGroup;
  agents = signal<AgentResume[]>([]);
  arrondissements = signal<ArrondissementResume[]>([]);
  agentsLoading = signal(false);
  arrondissementsLoading = signal(false);
  
  // Formulaire multiple
  bulkAgentId = signal<string | null>(null);
  bulkZones = signal<Array<{ 
    arrondissement_id: string; priorite: 1 | 2; selected: boolean 
  }>>([]);
  bulkLoading = signal(false);
  
  // Zone en cours d'édition
  editingZone = signal<ZoneCompetenceAgentList | null>(null);
  
  // Computed
  filteredZones = computed(() => {
    let zones = this.zones();
    
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      zones = zones.filter(z => 
        z.agent_username.toLowerCase().includes(term) ||
        z.arrondissement_nom.toLowerCase().includes(term)
      );
    }
    
    if (this.filterActif() !== null) {
      zones = zones.filter(z => z.actif === this.filterActif());
    }
    
    if (this.filterPriorite() !== null) {
      zones = zones.filter(z => z.priorite === this.filterPriorite());
    }
    
    return zones;
  });
  
  statsPrincipales = computed(() => 
    this.stats()?.repartition_par_priorite?.priorite_1 ?? 0
  );
  
  statsSecondaires = computed(() => 
    this.stats()?.repartition_par_priorite?.priorite_2 ?? 0
  );
  
  constructor() {
    this.zoneForm = this.fb.group({
      agent_id: ['', Validators.required],
      arrondissement_id: ['', Validators.required],
      priorite: [1, [Validators.required, Validators.min(1), Validators.max(2)]],
      actif: [true]
    });
  }
  
  ngOnInit(): void {
    this.loadZones();
    this.loadStats();
    this.loadAgents();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  // ─── Chargement des données ─────────────────────────────────────────────
  
  loadZones(): void {
    this.service.getZones({
      actif: this.filterActif() ?? undefined,
      priorite: this.filterPriorite() ?? undefined
    }).pipe(takeUntil(this.destroy$)).subscribe({
      error: () => this.toast.showError('Erreur lors du chargement des zones.')
    });
  }
  
  loadStats(): void {
    this.service.getStats().pipe(takeUntil(this.destroy$)).subscribe();
  }
  
  loadAgents(): void {
    this.agentsLoading.set(true);
    this.service.getAgentsDisponibles().pipe(takeUntil(this.destroy$)).subscribe({
      next: (agents) => {
        this.agents.set(agents);
        this.agentsLoading.set(false);
      },
      error: () => {
        this.toast.showError('Erreur lors du chargement des agents.');
        this.agentsLoading.set(false);
      }
    });
  }
  
  loadArrondissements(agentId?: string): void {
    this.arrondissementsLoading.set(true);
    this.service.getArrondissementsDisponibles(agentId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (arrondissements) => {
        this.arrondissements.set(arrondissements);
        this.arrondissementsLoading.set(false);
      },
      error: () => {
        this.toast.showError('Erreur lors du chargement des arrondissements.');
        this.arrondissementsLoading.set(false);
      }
    });
  }
  
  // ─── Gestion des onglets ────────────────────────────────────────────────
  
  setTab(tab: TabType): void {
    this.activeTab.set(tab);
    this.editingZone.set(null);
    
    if (tab === 'ajout-simple') {
      this.loadArrondissements();
      this.zoneForm.reset({ priorite: 1, actif: true });
    } else if (tab === 'ajout-multiple') {
      this.bulkAgentId.set(null);
      this.bulkZones.set([]);
    }
  }
  
  // ─── Filtres ───────────────────────────────────────────────────────────
  
  onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }
  
  toggleFilterActif(value: boolean | null): void {
    this.filterActif.set(value);
    this.loadZones();
  }
  
  toggleFilterPriorite(value: 1 | 2 | null): void {
    this.filterPriorite.set(value);
    this.loadZones();
  }
  
  clearFilters(): void {
    this.searchTerm.set('');
    this.filterActif.set(null);
    this.filterPriorite.set(null);
    this.loadZones();
  }
  
  // ─── CRUD simple ───────────────────────────────────────────────────────
  
  onAgentChange(): void {
    const agentId = this.zoneForm.get('agent_id')?.value;
    if (agentId) {
      this.loadArrondissements(agentId);
    }
  }
  
  async saveZone(): Promise<void> {
    if (this.zoneForm.invalid) {
      this.zoneForm.markAllAsTouched();
      this.toast.showError('Veuillez remplir tous les champs requis.');
      return;
    }
    
    const payload: CreateZoneCompetencePayload = this.zoneForm.value;
    
    this.service.createZone(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toast.showSuccess('Zone de compétence créée avec succès.');
        this.zoneForm.reset({ priorite: 1, actif: true });
        this.loadZones();
        this.setTab('liste');
      },
      error: (err) => {
        const detail = err.error?.detail 
        || err.error?.priorite 
        || 'Erreur lors de la création.';
        this.toast.showError(detail);
      }
    });
  }
  
  startEdit(zone: ZoneCompetenceAgentList): void {
    this.editingZone.set(zone);
    this.activeTab.set('ajout-simple');
    
    this.zoneForm.patchValue({
      agent_id: zone.id, // Note: on n'a que l'username dans la liste
      arrondissement_id: zone.arrondissement_nom, // À récupérer si nécessaire
      priorite: zone.priorite,
      actif: zone.actif
    });
  }
  
  cancelEdit(): void {
    this.editingZone.set(null);
    this.zoneForm.reset({ priorite: 1, actif: true });
  }
  
  async toggleZoneActif(zone: ZoneCompetenceAgentList): Promise<void> {
    const newState = !zone.actif;
    const action = newState ? 'activer' : 'désactiver';
    
    const confirmed = await this.confirmation.confirm({
      title: `${newState ? 'Activer' : 'Désactiver'} la zone`,
      type: 'bg-warning',
      message: `Voulez-vous vraiment ${action} la zone de 
      ${zone.agent_username} sur ${zone.arrondissement_nom} ?`,
      icon: 'bi-exclamation-triangle',
      confirmLabel: 'Oui, confirmer',
      cancelLabel: 'Annuler'
    });
    
    if (!confirmed) return;
    
    this.service.toggleActif(zone.id, newState).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toast.showSuccess(`Zone ${action} avec succès.`);
        this.loadZones();
      },
      error: () => this.toast.showError(`Erreur lors de la ${action}.`)
    });
  }
  
  async deleteZone(zone: ZoneCompetenceAgentList): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Supprimer la zone',
      type: 'bg-danger',
      message: `Voulez-vous vraiment supprimer la zone de 
      ${zone.agent_username} sur ${zone.arrondissement_nom} 
      ? Cette action est irréversible.`,
      icon: 'bi-trash',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler'
    });
    
    if (!confirmed) return;
    
    this.service.deleteZone(zone.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toast.showSuccess('Zone supprimée avec succès.');
        this.loadZones();
      },
      error: () => this.toast.showError('Erreur lors de la suppression.')
    });
  }
  
  // ─── Ajout multiple ────────────────────────────────────────────────────
  
  onBulkAgentChange(agentId: string): void {
    this.bulkAgentId.set(agentId);
    this.loadArrondissementsForBulk(agentId);
  }
  
  loadArrondissementsForBulk(agentId: string): void {
    this.arrondissementsLoading.set(true);
    this.service.getArrondissementsDisponibles(agentId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (arrondissements) => {
        // Filtrer ceux qui n'ont pas déjà une zone principale
        const disponibles = arrondissements.filter(a => 
          !a.zone_existante || a.priorite_existante !== 1
        );
        
        this.bulkZones.set(disponibles.map(a => ({
          arrondissement_id: a.id,
          priorite: a.priorite_existante === 2 ? 2 : 1 as 1 | 2,
          selected: false
        })));
        
        this.arrondissementsLoading.set(false);
      },
      error: () => {
        this.toast.showError('Erreur lors du chargement des arrondissements.');
        this.arrondissementsLoading.set(false);
      }
    });
  }
  
  toggleZoneSelection(index: number): void {
    this.bulkZones.update(zones => {
      zones[index].selected = !zones[index].selected;
      return [...zones];
    });
  }
  
  updateBulkPriorite(index: number, priorite: 1 | 2): void {
    this.bulkZones.update(zones => {
      zones[index].priorite = priorite;
      return [...zones];
    });
  }
  
  selectAllZones(): void {
    this.bulkZones.update(zones => zones.map(z => ({ ...z, selected: true })));
  }
  
  deselectAllZones(): void {
    this.bulkZones.update(zones => zones.map(z => ({ ...z, selected: false })));
  }
  
  get selectedZonesCount(): number {
    return this.bulkZones().filter(z => z.selected).length;
  }
  
  async saveBulkZones(): Promise<void> {
    const agentId = this.bulkAgentId();
    const selectedZones = this.bulkZones().filter(z => z.selected);
    
    if (!agentId) {
      this.toast.showError('Veuillez sélectionner un agent.');
      return;
    }
    
    if (selectedZones.length === 0) {
      this.toast.showError('Veuillez sélectionner au moins une zone.');
      return;
    }
    
    const payload: BulkCreatePayload = {
      agent_id: agentId,
      zones: selectedZones.map(z => ({
        arrondissement_id: z.arrondissement_id,
        priorite: z.priorite
      }))
    };
    
    this.bulkLoading.set(true);
    
    this.service.bulkCreate(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response.total_created > 0) {
          this.toast.showSuccess(`${response.total_created} zone(s) créée(s) avec succès.`);
        }
        
        if (response.total_errors > 0) {
          this.toast.showError(`${response.total_errors} erreur(s) lors de la création.`);
        }
        
        this.loadZones();
        this.setTab('liste');
        this.bulkLoading.set(false);
      },
      error: () => {
        this.toast.showError('Erreur lors de la création en masse.');
        this.bulkLoading.set(false);
      }
    });
  }
  
  // ─── Helpers ───────────────────────────────────────────────────────────
  
  getPrioriteLabel(priorite: 1 | 2): string {
    return priorite === 1 ? 'Zone principale' : 'Zone secondaire';
  }
  
  getPrioriteClass(priorite: 1 | 2): string {
    return priorite === 1 ? 'priorite--principale' : 'priorite--secondaire';
  }
  
  getAgentDisplay(agent: AgentResume): string {
    let display = agent.username;
    if (agent.phone) display += ` (${agent.phone})`;
    display += ` — ${agent.nb_zones_principales} principale(s), 
    ${agent.nb_zones_secondaires} secondaire(s)`;
    return display;
  }

}
