import { CommonModule } from '@angular/common';
import { Component, computed, effect, EventEmitter, inject, OnInit, Output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AnnonceFilters } from '../../models/annonce.model';
import { TypeAnnonce } from '../../models/type-annonce.model';
import { TypeAnnonceService } from '../../services/type-annonce.service';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { TitreFoncierService } from '../../../foncier/services/titre-foncier';
import { VilleService } from '../../../foncier/services/ville-service';
import { ArrondissementVille } from '../../../foncier/models/ville.model';

@Component({
  selector: 'app-annonce-filter',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './annonce-filter.html',
  styleUrl: './annonce-filter.scss'
})
export class AnnonceFilter implements OnInit {

  @Output() filtresChange = new EventEmitter<AnnonceFilters>();

  //form!: FormGroup;
  typeAnnonces = signal<TypeAnnonce[]>([]);
  filtresActifs = signal(0);   // nombre de filtres actifs (badge)
  ouvert = signal(false);      // panneau ouvert/fermé sur mobile
  arrondissements = signal<any[]>([]);

  private fb              = inject(FormBuilder);
  private typeAnnonceSvc  = inject(TypeAnnonceService);
  private typeFSvc        = inject(TitreFoncierService);
  private villeSvc        = inject(VilleService);

  // Cascade géographique
  villes               = this.villeSvc.villesAvecArrondissements;
  villeSelectionnee    = signal('');
  arrondissementsFiltres = computed<ArrondissementVille[]>(() =>
    this.villeSelectionnee() ? this.villeSvc.arrondissementsDe(this.villeSelectionnee()) : []
  );

  // Mode actif pour les filtres avancés
  modeActif = signal<'IMMOBILIER' | 'EVENEMENTIEL' | ''>('');

  readonly TYPES_ESPACE = [
    { val: 'SALLE_FETES',      label: 'Salle des fêtes' },
    { val: 'SALLE_CONFERENCE', label: 'Conférence'       },
    { val: 'SALLE_MARIAGE',    label: 'Mariage'          },
    { val: 'SALLE_REUNION',    label: 'Réunion'          },
    { val: 'PLEIN_AIR',        label: 'Plein air'        },
    { val: 'RESTAURANT',       label: 'Restaurant'       },
    { val: 'STUDIO',           label: 'Studio'           },
    { val: 'TERRAIN_SPORT',    label: 'Sport'            },
  ];

  readonly typesTransaction = [
    { value: '',              label: 'Tous' },
    { value: 'VENTE',         label: 'Vente' },
    { value: 'LOCATION',      label: 'Location' },
    { value: 'LOCATION_VENTE',label: 'Location-vente' },
  ];

  readonly optionsTri = [
    { value: '',                   label: 'Par défaut'         },
    { value: 'prix_asc',           label: 'Prix croissant'     },
    { value: 'prix_desc',          label: 'Prix décroissant'   },
    { value: 'superficie_asc',     label: 'Superficie ↑'       },
    { value: 'superficie_desc',    label: 'Superficie ↓'       },
    { value: 'date_desc',          label: 'Plus récentes'      },
    { value: 'date_asc',           label: 'Plus anciennes'     },
    { value: 'arrondissement_asc', label: 'Ville A→Z'          },
  ];

  form = this.fb.group({
    search:             [''],
    type_annonce:       [''],
    type_bien_annonce:  [''],
    // Bien immobilier
    type_transaction:   [''],
    prix_min:           [null as number | null],
    prix_max:           [null as number | null],
    superficie_min:     [null as number | null],
    superficie_max:     [null as number | null],
    avec_titre_foncier: [false],
    arrondissement:     [''],
    // Événementiel
    capacite_min:       [null as number | null],
    equipement:         [''],
    date_dispo:         [''],
    // Commun
    zone:               [''],
    ordering:           ['date_desc'],
  });

  ngOnInit(): void {
    this.typeAnnonceSvc.fetchTypeAnnonces();
    this.typeAnnonceSvc.typeAnnonces$.subscribe(d => this.typeAnnonces.set(d));

    if (!this.villeSvc.isLoaded()) {
      this.villeSvc.chargerSiNecessaire().subscribe();
    }

    // Debounce sur texte
    for (const f of ['search', 'zone', 'equipement']) {
      this.form.get(f)!.valueChanges.pipe(
        debounceTime(400), distinctUntilChanged()
      ).subscribe(() => this._emettre());
    }

    // Immédiat sur selects
    for (const f of ['type_annonce', 'type_bien_annonce', 'type_transaction',
                     'avec_titre_foncier', 'ordering', 'arrondissement', 'date_dispo']) {
      this.form.get(f)!.valueChanges.subscribe(() => this._emettre());
    }

    // Mettre à jour modeActif selon le discriminateur
    this.form.get('type_bien_annonce')!.valueChanges.subscribe(v => {
      this.modeActif.set(v as any || '');
    });

    this._emettre();
  }

  onVilleChange(ville: string): void {
    this.villeSelectionnee.set(ville);
    this.form.get('arrondissement')?.setValue('');
    this._emettre();
  }

  appliquerPrix():       void { this._emettre(); }
  appliquerSuperficie(): void { this._emettre(); }
  appliquerCapacite():   void { this._emettre(); }

  reset(): void {
    this.villeSelectionnee.set('');
    this.form.reset({
      search:'',type_annonce:'',type_bien_annonce:'',type_transaction:'',
      prix_min:null,prix_max:null,superficie_min:null,superficie_max:null,
      avec_titre_foncier:false,arrondissement:'',
      capacite_min:null,equipement:'',date_dispo:'',
      zone:'',ordering:'date_desc',
    });
    this._emettre();
  }

  toggleOuvert(): void { this.ouvert.update(v => !v); }

  private _emettre(): void {
    const v = this.form.getRawValue();
    const f: AnnonceFilters = {};

    if (v.search?.trim())        f.search = v.search.trim();
    if (v.type_annonce)          f.type_annonce = v.type_annonce;
    if (v.type_bien_annonce)     f.type_bien_annonce = v.type_bien_annonce as any;
    if (v.ordering)              f.ordering = v.ordering;
    if (v.zone?.trim())          f.zone = v.zone.trim();
    if (v.arrondissement)        f.arrondissement = v.arrondissement;
    else if (this.villeSelectionnee()) f.ville = this.villeSelectionnee();

    // Bien immobilier
    if (v.type_transaction)       f.type_transaction = v.type_transaction;
    if (v.prix_min != null)       f.prix_min = v.prix_min!;
    if (v.prix_max != null)       f.prix_max = v.prix_max!;
    if (v.superficie_min != null) f.superficie_min = v.superficie_min!;
    if (v.superficie_max != null) f.superficie_max = v.superficie_max!;
    if (v.avec_titre_foncier)     f.avec_titre_foncier = true;

    // Événementiel
    if (v.capacite_min != null)   f.capacite_min = v.capacite_min!;
    if (v.equipement?.trim())     f.equipement = v.equipement.trim();
    if (v.date_dispo)             f.date_dispo = v.date_dispo;

    // Compteur filtres actifs (hors tri et défauts)
    const actifs = [
      v.search, v.type_annonce, v.type_bien_annonce, v.type_transaction,
      v.prix_min, v.prix_max, v.superficie_min, v.superficie_max,
      v.zone, v.avec_titre_foncier, v.arrondissement, this.villeSelectionnee() || null,
      v.capacite_min, v.equipement, v.date_dispo,
    ].filter(x => x !== null && x !== '' && x !== false && x !== undefined).length;

    this.filtresActifs.set(actifs);
    this.filtresChange.emit(f);
  }
}
