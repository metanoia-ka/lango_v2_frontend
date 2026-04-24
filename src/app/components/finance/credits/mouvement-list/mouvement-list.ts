import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ManuelRefundRequest, MouvementCredit } from '../../models/credit.model';
import { Authentication } from '../../../../auth/core/authentication';
import { ToastService } from '../../../../services/toast.service';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';
import { Router } from '@angular/router';
import { CreditService } from '../../services/credit';
import { animate, style, transition, trigger } from '@angular/animations';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { UserService } from '../../../users/service/user.service';

interface UserSearchResult {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  credit_balance: number;
}

@Component({
  selector: 'app-mouvement-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbTooltipModule],
  templateUrl: './mouvement-list.html',
  styleUrls: ['./mouvement-list.scss'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms ease-out', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateX(100%)' }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class MouvementList implements OnInit {
  
  readonly router = inject(Router);
  private confirmation = inject(ConfirmationService);
  private toast = inject(ToastService);
  readonly auth = inject(Authentication);
  private creditSvc = inject(CreditService);
  private userSvc   = inject(UserService);
  
  // ─── États locaux ─────────────────────────────────────────────────────
  afficherForm = signal(false);
  enEdition = signal<MouvementCredit | null>(null);
  enregistrant = signal(false);
  isLoading = this.creditSvc.isLoading;
  mouvements = this.creditSvc.mouvements;
  
  // Filtres et recherche
  searchTerm = signal('');
  filterType = signal<'all' | 'ACHAT' | 'REMBOURSEMENT'>('all');
  private searchSubject = new Subject<string>();
  
  // Tri
  sortField = signal<'created_at' | 'user_username' | 'montant'>('created_at');
  sortDirection = signal<'asc' | 'desc'>('desc');
  
  // Pagination
  currentPage = 1;
  pageSize = 15;
  
  // Formulaire
  refundData: ManuelRefundRequest = {
    user_id: '',
    montant: 10,
    raison: ''
  };
  
  // Recherche utilisateur
  userSearch = signal('');
  userSearchFocused = false;
  filteredUsers = signal<UserSearchResult[]>([]);
  selectedUser = computed(() => {
    // À implémenter : récupérer l'utilisateur depuis le service
    return null;
  });
  
  // Modale de détails
  selectedMouvement = signal<MouvementCredit | null>(null);
  
  // Raisons rapides
  readonly quickReasons = [
    'Erreur de débit',
    'Remboursement client',
    'Compensation',
    'Offre promotionnelle',
    'Problème technique'
  ];
  
  readonly isAdmin = this.auth.hasRole('Admin');
  readonly isAdminOrManager = this.auth.hasAnyRole(['Admin', 'Manager']);
  
  // ─── Computed ─────────────────────────────────────────────────────────
  totalMouvements = computed(() => this.mouvements().length);
  
  totalRembourses = computed(() => 
    this.mouvements()
      .filter(m => m.type_mouvement === 'REMBOURSEMENT')
      .reduce((sum, m) => sum + m.montant, 0)
  );
  
  totalAchats = computed(() => 
    this.mouvements()
      .filter(m => m.type_mouvement === 'ACHAT')
      .reduce((sum, m) => sum + m.montant, 0)
  );
  
  soldeTotal = computed(() => this.totalAchats() - this.totalRembourses());
  
  filteredMouvements = computed(() => {
    let result = this.mouvements();
    
    // Filtre par type
    if (this.filterType() !== 'all') {
      result = result.filter(m => m.type_mouvement === this.filterType());
    }
    
    // Recherche texte
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      result = result.filter(m => 
        m.user_username.toLowerCase().includes(term) ||
        m.description?.toLowerCase().includes(term) ||
        m.reference_id?.toLowerCase().includes(term)
      );
    }
    
    // Tri
    result = [...result].sort((a, b) => {
      const field = this.sortField();
      const direction = this.sortDirection() === 'asc' ? 1 : -1;
      
      const aVal = a[field as keyof MouvementCredit];
      const bVal = b[field as keyof MouvementCredit];
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return direction * aVal.localeCompare(bVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction * (aVal - bVal);
      }
      return 0;
    });
    
    return result;
  });
  
  paginatedMouvements = computed(() => {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredMouvements().slice(start, end);
  });
  
  totalPages = computed(() => Math.ceil(this.filteredMouvements().length / this.pageSize));
  
  visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage;
    
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }
    
    if (current >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }
    
    return [1, '...', current - 1, current, current + 1, '...', total];
  });
  
  // ─── Lifecycle ────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadMouvements();
    
    // Debounce sur la recherche
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage = 1;
    });
  }
  
  // ─── Méthodes ─────────────────────────────────────────────────────────
  loadMouvements(): void {
    const filters: any = {};
    if (this.filterType() !== 'all') {
      filters.type = this.filterType();
    }
    this.creditSvc.getHistoriqueMouvements(filters).subscribe();
  }
  
  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm());
  }
  
  clearFilters(): void {
    this.searchTerm.set('');
    this.filterType.set('all');
    this.currentPage = 1;
    this.loadMouvements();
  }
  
  sortBy(field: 'created_at' | 'user_username' | 'montant'): void {
    if (this.sortField() === field) {
      this.sortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('desc');
    }
  }
  
  goToPage(page: number | string): void {
    if (typeof page === 'number' && page >= 1 && page <= this.totalPages()) {
      this.currentPage = page;
    }
  }
  
  ouvrirAjout(): void {
    this.enEdition.set(null);
    this.refundData = { user_id: '', montant: 10, raison: '' };
    this.userSearch.set('');
    this.afficherForm.set(true);
  }
  
  ouvrirEdition(mvt: MouvementCredit): void {
    this.enEdition.set(mvt);
    this.refundData = {
      user_id: mvt.user,
      montant: mvt.montant,
      raison: mvt.description || ''
    };
    this.afficherForm.set(true);
  }
  
  annulerForm(): void {
    this.afficherForm.set(false);
    this.enEdition.set(null);
    this.userSearch.set('');
  }
  
  searchUsers(): void {
    // À implémenter : appel API pour rechercher les utilisateurs
    const search = this.userSearch();
    if (search.length < 2) {
      this.filteredUsers.set([]);
      return;
    }
    // this.userService.searchUsers(search).subscribe(...)
  }
  
  selectUser(user: UserSearchResult): void {
    this.refundData.user_id = user.id;
    this.userSearch.set(user.username);
    this.filteredUsers.set([]);
  }
  
  isFormValid(): boolean {
    return !!(
      this.refundData.user_id &&
      this.refundData.montant > 0 &&
      this.refundData.raison?.trim()
    );
  }
  
  enregistrer(): void {
    if (!this.isFormValid()) {
      this.toast.showError('Veuillez remplir tous les champs requis.');
      return;
    }
    
    this.enregistrant.set(true);
    const edition = this.enEdition();
    const payload = { ...this.refundData };
    
    const obs = this.creditSvc.rembourserManuellement(payload);
    
    obs.subscribe({
      next: () => {
        this.toast.showSuccess(edition ? 'Remboursement modifié avec succès.' : 'Remboursement effectué avec succès.');
        this.enregistrant.set(false);
        this.afficherForm.set(false);
        this.enEdition.set(null);
        this.loadMouvements();
      },
      error: (err) => {
        this.toast.showError(err.error?.detail ?? 'Erreur lors de l\'enregistrement.');
        this.enregistrant.set(false);
      }
    });
  }
  
  showDetails(mvt: MouvementCredit): void {
    this.selectedMouvement.set(mvt);
  }
  
  closeDetails(): void {
    this.selectedMouvement.set(null);
  }
  
  // ─── Helpers d'affichage ──────────────────────────────────────────────
  getTypeClass(type: string): string {
    const classes: Record<string, string> = {
      'ACHAT': 'type-badge--purchase',
      'REMBOURSEMENT': 'type-badge--refund',
    };
    return classes[type] || '';
  }
  
  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'ACHAT': 'bi bi-cart-check',
      'REMBOURSEMENT': 'bi bi-arrow-counterclockwise'
    };
    return icons[type] || 'bi bi-circle';
  }
}