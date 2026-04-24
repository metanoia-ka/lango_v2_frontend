import { CommonModule } from '@angular/common';
import { Component, computed, inject, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { 
  AbstractControl, 
  FormBuilder, 
  FormGroup, 
  FormsModule, 
  ReactiveFormsModule, 
  Validators 
} from '@angular/forms';
import { Arrondissement, Departement, TitreFoncier } from '../../models/titre-foncier.model';
import { TitreFoncierService } from '../../services/titre-foncier';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil } from 'rxjs';
import { ToastService } from '../../../../services/toast.service';

@Component({
  selector: 'app-titre-foncier-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './titre-foncier-form.html',
  styleUrl: './titre-foncier-form.scss'
})
export class TitreFoncierForm implements OnInit, OnDestroy {

  @Input() titreFoncier?: TitreFoncier;   // si fourni → mode édition

  private readonly fb = inject(FormBuilder);
  private readonly tfSvc = inject(TitreFoncierService);
  private toast       = inject(ToastService);
  readonly activeModal = inject(NgbActiveModal);
  private destroy$    = new Subject<void>();

  loading = signal(false);
  error = signal('');

  saving   = signal(false);
  regions  = this.tfSvc.regions;

  fieldErrors = signal<Record<string, string>>({});
  scanPreview = signal<string | null>(null);
  selectedFile: File | null = null;

  // Départements + arrondissements selon sélection
  departements    = signal<Departement[]>([]);
  arrondissements = signal<Arrondissement[]>([]);

  form!: FormGroup;
  // Fichier
  fichierScan: File | null = null;

  // Aperçu numéro
  abrDeptSelectionne = signal('');
  preview = computed(() => {
    const seq = this.form?.get('numero_sequence')?.value;
    const abr = this.abrDeptSelectionne();
    return seq && abr ? `TF N°${seq}/${abr}` : '';
  });

  get isEdit() { return !!this.titreFoncier; }

  ngOnInit(): void {
    this.form = this.fb.group({
      region_id:         [''],
      departement_id:    ['', Validators.required],
      arrondissement_id: [''],
      numero_sequence:   [null, [Validators.required, Validators.min(1)]],
      superficie_totale: [null, [Validators.required, Validators.min(1)]],
    });

    // Charger les régions si pas encore chargées
    if (!this.regions().length) {
      this.tfSvc.getRegionsAvecDepartements().pipe(
        takeUntil(this.destroy$)
      ).subscribe();
    }

    // Pré-remplir en mode édition
    if (this.titreFoncier) {
      const tf = this.titreFoncier;
      this.form.patchValue({
        region_id:         tf.region         ?? '',
        departement_id:    tf.departement    ?? '',
        arrondissement_id: tf.arrondissement ?? '',
        numero_sequence:   tf.numero_sequence,
        superficie_totale: tf.superficie_totale,
      });
      if (tf.region) {
        this._chargerDepartements(tf.region);
      }
      if (tf.departement) {
        this.abrDeptSelectionne.set(tf.departement_abr ?? '');
        this._chargerArrondissements(tf.departement);
      }
    }

    // Réactivité : changement région → recharger depts
    this.form.get('region_id')!.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(regionId => {
      this.form.patchValue({ departement_id: '', arrondissement_id: '' });
      this.arrondissements.set([]);
      this.abrDeptSelectionne.set('');
      if (regionId) this._chargerDepartements(regionId);
    });

    // Réactivité : changement département → recharger arrs + aperçu
    this.form.get('departement_id')!.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(deptId => {
      this.form.patchValue({ arrondissement_id: '' });
      this.arrondissements.set([]);
      if (deptId) {
        const dept = this.departements().find(d => d.id === deptId);
        this.abrDeptSelectionne.set(dept?.abreviation ?? '');
        this._chargerArrondissements(deptId);
      } else {
        this.abrDeptSelectionne.set('');
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private _chargerDepartements(regionId: string): void {
    const region = this.regions().find(r => r.id === regionId);
    this.departements.set(region?.departements ?? []);
  }

  private _chargerArrondissements(deptId: string): void {
    this.tfSvc.getArrondissements(deptId).pipe(
      takeUntil(this.destroy$)
    ).subscribe(arrs => this.arrondissements.set(arrs));
  }

  // ── Accès champs ───────────────────────────────────────────────
  get f(): Record<string, AbstractControl> {
    return this.form.controls as Record<string, AbstractControl>;
  }

  fieldError(name: string): string {
    return this.fieldErrors()[name] || '';
  }

  hasError(name: string): boolean {
    const ctrl = this.f[name];
    return (ctrl?.invalid && ctrl?.touched) || !!this.fieldErrors()[name];
  }

  // ── Fichier scan ───────────────────────────────────────────────
  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    // Validation côté client
    const ext   = file.name.split('.').pop()?.toLowerCase();
    const valid = ['pdf', 'jpg', 'jpeg', 'png'].includes(ext ?? '');
    if (!valid) {
      this.fieldErrors.update(e => (
        { ...e, document_scan: 'Format non supporté (PDF, JPG, PNG).' }
      ));
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      this.fieldErrors.update(e => (
        { ...e, document_scan: 'Fichier trop volumineux (max 1.5 Mo).' }
      ));
      return;
    }

    this.selectedFile = file;
    this.fieldErrors.update(e => ({ ...e, document_scan: '' }));

    // Prévisualisation image
    if (['jpg', 'jpeg', 'png'].includes(ext ?? '')) {
      const reader = new FileReader();
      reader.onload = e => this.scanPreview.set(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      this.scanPreview.set('pdf');
    }
  }

  onFichierChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fichierScan = input.files?.[0] ?? null;
  }

  removeScan(): void {
    this.selectedFile = null;
    this.scanPreview.set(null);
  }

  // ── Soumission ─────────────────────────────────────────────────
  soumettre(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (!this.isEdit && !this.fichierScan) {
      this.error.set('Le scan du titre foncier est obligatoire.');
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const fd = new FormData();
    const v  = this.form.value;

    if (v.region_id)         fd.append('region_id',         v.region_id);
    if (v.departement_id)    fd.append('departement_id',    v.departement_id);
    if (v.arrondissement_id) fd.append('arrondissement_id', v.arrondissement_id);
    fd.append('numero_sequence',  String(v.numero_sequence));
    fd.append('superficie_totale', String(v.superficie_totale));
    if (this.fichierScan)    fd.append('document_scan', this.fichierScan);

    const obs$ = this.isEdit
      ? this.tfSvc.modifier(this.titreFoncier!.id, fd)
      : this.tfSvc.creer(fd);

    obs$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toast.showSuccess(
          this.isEdit ? 'Titre foncier mis à jour.' : 'Titre foncier créé.'
        );
        this.activeModal.close('saved');
        this.saving.set(false);
      },
      error: e => {
        const err = e.error;
        if (err?.numero_sequence) this.error.set(err.numero_sequence[0]);
        else if (err?.departement_id) this.error.set(err.departement_id[0]);
        else this.error.set(err?.detail ?? 'Erreur lors de la sauvegarde.');
        this.saving.set(false);
      }
    });
  }

  isFieldInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && c.touched);
  }

  fermer(): void { this.activeModal.dismiss(); }
}
