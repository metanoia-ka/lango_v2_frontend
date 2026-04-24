import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TypeBienService } from '../../../foncier/services/categorie-type-bien-immobilier';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { 
  CategorieBienAvecTypes, 
  RegionComplete 
} from '../../../foncier/models/categorie-type-bien-immobilier.model';
import { AnnonceFilters } from '../../models/annonce.model';
import { TitreFoncierService } from '../../../foncier/services/titre-foncier';
import { TypeTransaction } from '../../../foncier/models/bien-type-immobilier.model';
import { VilleService } from '../../../foncier/services/ville-service';
import { ArrondissementVille } from '../../../foncier/models/ville.model';

type Intention = 'VENTE' | 'LOCATION' | 'LOCATION_VENTE';
type ModeBien  = 'IMMOBILIER' | 'EVENEMENTIEL';

@Component({
  selector: 'app-annonce-search-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './annonce-search-modal.html',
  styleUrl: './annonce-search-modal.scss'
})
export class AnnonceSearchModal implements OnInit {

  private typeSvc     = inject(TypeBienService);
  readonly modal      = inject(NgbActiveModal);
  private typeFSvc    = inject(TitreFoncierService);
  private villeSvc    = inject(VilleService);

  // ── Étapes ────────────────────────────────────────────────────────────────
  etape = signal<1 | 2 | 3>(1);

  // ── Mode : bien immobilier ou espace événementiel ─────────────────────────
  modeBien = signal<ModeBien>('IMMOBILIER');

  // ── Données ────────────────────────────────────────────────────────────────
  villes              = this.villeSvc.villesAvecArrondissements;
  categoriesAvecTypes = signal<any[]>([]);
  loading             = signal(false);

  // ── Sélections communes ───────────────────────────────────────────────────
  villeSel           = signal('');
  arrondissementSel  = signal('');
  rechercheSaisie    = signal('');

  // ── Sélections IMMOBILIER ─────────────────────────────────────────────────
  typeTransactionSel = signal<Intention | ''>('');
  categorieSel       = signal('');
  typeBienSel        = signal('');

  // ── Sélections ÉVÉNEMENTIEL ───────────────────────────────────────────────
  typeEspaceSel      = signal<string[]>([]);
  capaciteMinSel     = signal<number | null>(null);
  dateDispoSel       = signal('');
  equipementSel      = signal('');

  // ── Computed ──────────────────────────────────────────────────────────────
  arrondissementsDispo = computed<ArrondissementVille[]>(() =>
    this.villeSel() ? this.villeSvc.arrondissementsDe(this.villeSel()) : []
  );

  arrSel = computed<ArrondissementVille | null>(() => {
    const id = this.arrondissementSel();
    return this.arrondissementsDispo().find(a => a.id === id) ?? null;
  });

  typesFiltres = computed(() => {
    const catId = this.categorieSel();
    if (!catId) return [];
    return this.categoriesAvecTypes().find(c => c.id === catId)?.types.filter((t:any) => t.est_actif) ?? [];
  });

  resumeSelection = computed(() => {
    const parts: string[] = [];
    if (this.modeBien() === 'EVENEMENTIEL') {
      parts.push('Espace événementiel');
      if (this.typeEspaceSel().length) parts.push(`${this.typeEspaceSel().length} type(s)`);
    } else {
      const txLabels: Record<string, string> = {VENTE:'Acheter',LOCATION:'Louer',LOCATION_VENTE:'Location-vente'};
      if (this.typeTransactionSel()) parts.push(txLabels[this.typeTransactionSel()] ?? '');
    }
    if (this.villeSel()) parts.push(this.villeSel());
    if (this.arrSel()) parts.push(this.arrSel()!.nom);
    return parts.join(' · ');
  });

  readonly INTENTIONS = [
    { val: 'VENTE' as Intention,          icone: 'bi-house-door-fill', label: 'Acheter',        desc: 'Acquisition définitive' },
    { val: 'LOCATION' as Intention,       icone: 'bi-key-fill',        label: 'Louer',          desc: 'Location mensuelle' },
    { val: 'LOCATION_VENTE' as Intention, icone: 'bi-arrow-left-right',label: 'Location-vente', desc: 'Louer ou acheter' },
  ];

  readonly TYPES_ESPACE = [
    { val: 'SALLE_FETES',      label: 'Salle des fêtes',    icone: 'bi-balloon-heart' },
    { val: 'SALLE_CONFERENCE', label: 'Conférence',          icone: 'bi-projector' },
    { val: 'SALLE_MARIAGE',    label: 'Mariage / Réception', icone: 'bi-gem' },
    { val: 'SALLE_REUNION',    label: 'Réunion / Coworking', icone: 'bi-people' },
    { val: 'PLEIN_AIR',        label: 'Plein air / Jardin',  icone: 'bi-tree' },
    { val: 'RESTAURANT',       label: 'Restaurant privatisé',icone: 'bi-cup-hot' },
    { val: 'STUDIO',           label: 'Studio photo/vidéo',  icone: 'bi-camera-video' },
    { val: 'TERRAIN_SPORT',    label: 'Terrain de sport',    icone: 'bi-dribbble' },
  ];

  ngOnInit(): void {
    this.loading.set(true);
    if (this.villeSvc.isLoaded()) {
      this.loading.set(false);
    } else {
      this.villeSvc.chargerSiNecessaire().subscribe(() => this.loading.set(false));
    }
    this.typeSvc.getCategoriesAvecTypes().subscribe(cats => this.categoriesAvecTypes.set(cats));
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  choisirModeBien(mode: ModeBien): void {
    this.modeBien.set(mode);
    this.etape.set(2);
  }

  choisirIntention(val: Intention): void {
    this.typeTransactionSel.set(val);
    this.etape.set(2);
  }

  toggleTypeEspace(val: string): void {
    this.typeEspaceSel.update(list =>
      list.includes(val) ? list.filter(v => v !== val) : [...list, val]
    );
  }

  onVilleChange(ville: string): void {
    this.villeSel.set(ville);
    this.arrondissementSel.set('');
  }

  // ── Appliquer ──────────────────────────────────────────────────────────────

  appliquer(): void {
    const f: AnnonceFilters = {};

    // Discriminateur
    f.type_bien_annonce = this.modeBien();

    // Géographie commune
    if (this.arrondissementSel())    f.arrondissement = this.arrondissementSel();
    else if (this.villeSel())        f.ville          = this.villeSel();
    if (this.rechercheSaisie().trim()) f.zone         = this.rechercheSaisie().trim();

    if (this.modeBien() === 'IMMOBILIER') {
      if (this.typeTransactionSel())  f.type_transaction = this.typeTransactionSel();
      if (this.categorieSel())        f.categorie_bien   = this.categorieSel();
      if (this.typeBienSel())         f.type_bien        = this.typeBienSel();
    } else {
      if (this.typeEspaceSel().length) f.type_espace = this.typeEspaceSel();
      if (this.capaciteMinSel())       f.capacite_min = this.capaciteMinSel()!;
      if (this.dateDispoSel())         f.date_dispo   = this.dateDispoSel();
      if (this.equipementSel().trim()) f.equipement   = this.equipementSel().trim();
    }

    this.modal.close(f);
  }

  passer(): void { this.modal.dismiss('skip'); }

}
