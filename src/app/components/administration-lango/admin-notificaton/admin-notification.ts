import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { AdministrationNotificationService } from '../admin-notification.service';
import { 
  FormArray, 
  FormBuilder, 
  FormsModule, 
  ReactiveFormsModule, 
  Validators 
} from '@angular/forms';
import { 
  DocumentRequis, 
  EnvoyerNotifPayload, 
  NotificationType 
} from '../admin-notification.model';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';

type CibleType = 'user' | 'multiple' | 'role' | 'broadcast';

@Component({
  selector: 'app-admin-notificaton',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-notification.html',
  styleUrl: './admin-notification.scss'
})
export class AdminNotification implements OnInit{

  private svc = inject(AdministrationNotificationService);
  private fb = inject(FormBuilder);

  // ── État ──────────────────────────────────────────────────────
  users = signal<any[]>([]);
  isSubmitting = signal(false);
  successMsg = signal('');
  errorMsg = signal('');
  searchTerm = signal('');
  cible: CibleType = 'user';

  selectedUserIds = signal<Set<string>>(new Set());

  // Signal pour les fichiers PDF sélectionnés
  pdfsFichiers = signal<File[]>([]);
  liensExternes = signal<string[]>([]);
  nouveauLien = '';

  filteredUsers = computed(() => {
    const t = this.searchTerm().toLowerCase();
    return this.users().filter(u =>
      (u.username ?? '').toLowerCase().includes(t) ||
      (u.phone ?? '').toLowerCase().includes(t)
    );
  });

  // ── Métadonnées types notif ──────────────────────────────────
  typesNotif: 
  { value: NotificationType; label: string; icone: string; couleur: string }[] = 
  [
    { value: 'INFO', 
      label: 'Information', 
      icone: 'bi-info-circle', 
      couleur: '#6366f1' 
    },
    { value: 'VERIFICATION', 
      label: 'Vérification', 
      icone: 'bi-shield-check', 
      couleur: '#3b82f6' 
    },
    { value: 'CORRECTION',      
      label: 'Correction', 
      icone: 'bi-exclamation-triangle', 
      couleur: '#f59e0b' 
    },
    { value: 'VALIDATION', 
      label: 'Validation', 
      icone: 'bi-check-circle', 
      couleur: '#008753' 
    },
    { value: 'REJET', 
      label: 'Rejet', 
      icone: 'bi-x-circle', 
      couleur: '#ef4444' 
    },
    { value: 'SYSTEM', 
      label: 'Système', 
      icone: 'bi-gear', 
      couleur: '#6b7280' 
    },
    { value: 'DOCUMENT_REQUIS', 
      label: 'Documents requis', 
      icone: 'bi-file-earmark-arrow-up', 
      couleur: '#7c3aed' 
    },
    { value: 'ACTION_REQUISE', 
      label: 'Action requise', 
      icone: 'bi-hand-index', 
      couleur: '#f97316' 
    },
    { value: 'RAPPEL', 
      label: 'Rappel', 
      icone: 'bi-alarm', 
      couleur: '#0891b2' 
    },
    { value: 'RENDEZ_VOUS', 
      label: 'Rendez-vous', 
      icone: 'bi-calendar-check', 
      couleur: '#0f1111' 
    },
    { value: 'PROMOTION', 
      label: 'Promotion', 
      icone: 'bi-megaphone', 
      couleur: '#111c79' 
    },
    { value: 'ALERTE', 
      label: 'Alerte', 
      icone: 'bi-exclamation-triangle', 
      couleur: '#cc0631' 
    },
    { value: 'MESSAGE', 
      label: 'Message', 
      icone: 'bi-chat-dots', 
      couleur: '#5319f3' 
    }
  ];

  roles = ['Admin', 'Manager', 'Vendor', 'Purchaser'];

  // ── Formulaire principal ──────────────────────────────────────
  form = this.fb.group({
    type:    ['INFO' as NotificationType, Validators.required],
    titre:   ['', [Validators.required, Validators.maxLength(200)]],
    message: ['', Validators.required],
    role:    [''],
    expire_le: [null as string | null],
    demandeDocuments: [false],
    demandeConfirmation: [false],
    optionsConfirm: this.fb.array([])
  });

  private _ecouterTypeChanges(): void {
  const DUREES: Partial<Record<NotificationType, number>> = {
    DOCUMENT_REQUIS: 7,    // 7 jours
    ACTION_REQUISE:  3,    // 3 jours
    RAPPEL:          2,    // 2 jours
    RENDEZ_VOUS:     1,    // 1 jour
    // INFO, VALIDATION, REJET, etc. → pas d'expiration automatique
  };

  this.form.get('type')?.valueChanges.subscribe(type => {
    const jours = DUREES[type as NotificationType];
    if (jours) {
      const date = new Date();
      date.setDate(date.getDate() + jours);
      // Format attendu par input[type=datetime-local] : "YYYY-MM-DDTHH:mm"
      const iso = date.toISOString().slice(0, 16);
      this.form.get('expire_le')?.setValue(iso);
    } else {
      this.form.get('expire_le')?.setValue(null);
    }
  });
}

  // Documents requis construits dynamiquement
  documentsRequis = signal<DocumentRequis[]>([]);

  get optionsArray(): FormArray {
    return this.form.get('optionsConfirm') as FormArray;
  }

  // ── Init ──────────────────────────────────────────────────────
  ngOnInit(): void {
    this.svc.getUsers().subscribe({ next: u => this.users.set(u), error: () => {} });

    // Quand on active "demande de docs", ajouter un premier doc vide
    this.form.get('demandeDocuments')?.valueChanges.subscribe(v => {
      if (v && this.documentsRequis().length === 0) this.ajouterDoc();
      if (!v) this.documentsRequis.set([]);
    });

    // Quand on active "demande de confirmation", ajouter options par défaut
    this.form.get('demandeConfirmation')?.valueChanges.subscribe(v => {
      if (v && this.optionsArray.length === 0) {
        this.ajouterOption('Oui');
        this.ajouterOption('Non');
      }
      if (!v) this.optionsArray.clear();
    });

    this._ecouterTypeChanges();
  }

  // ── Sélection utilisateurs ────────────────────────────────────
  toggleUser(id: string): void {
    this.selectedUserIds.update(set => {
      const s = new Set(set);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  isSelected(id: string): boolean { return this.selectedUserIds().has(id); }

  selectAll(): void {
    this.selectedUserIds.set(new Set(this.filteredUsers().map(u => u.id)));
  }

  clearSelection(): void { this.selectedUserIds.set(new Set()); }

  // ── Documents requis ──────────────────────────────────────────
  ajouterDoc(): void {
    this.documentsRequis.update(d => [...d, {
      id: crypto.randomUUID(),
      nom: '',
      description: '',
      formats_acceptes: ['pdf', 'jpg', 'png'],
      taille_max_mo: 1,
      obligatoire: true
    }]);
  }

  supprimerDoc(id: string): void {
    this.documentsRequis.update(d => d.filter(x => x.id !== id));
  }

  updateDoc(id: string, field: keyof DocumentRequis, value: any): void {
    this.documentsRequis.update(d =>
      d.map(x => x.id === id ? { ...x, [field]: value } : x)
    );
  }

  // ── Options confirmation ──────────────────────────────────────
  ajouterOption(label = ''): void {
    this.optionsArray.push(
      this.fb.group({ label: [label, Validators.required], valeur: [label.toLowerCase()] })
    );
  }

  // ── Gestion fichiers PDF ──────────────────────────────────────────────────────
  onPdfsChange(event: Event): void {
    const input   = event.target as HTMLInputElement;
    const files   = Array.from(input.files ?? []);
    const valides = files.filter(f => {
      const ext  = f.name.split('.').pop()?.toLowerCase();
      const size = f.size <= 10 * 1024 * 1024;   // 10 Mo max
      return ext === 'pdf' && size;
    });
    this.pdfsFichiers.update(list => [...list, ...valides]);
    input.value = '';   // reset pour permettre re-sélection du même fichier
  }

  supprimerPdf(index: number): void {
    this.pdfsFichiers.update(list => list.filter((_, i) => i !== index));
  }

  supprimerOption(i: number): void { this.optionsArray.removeAt(i); }

  ajouterLien(): void {
    const lien = this.nouveauLien.trim();
    if (!lien.startsWith('http') || !lien.endsWith('.pdf')) return;
    this.liensExternes.update(list => [...list, lien]);
    this.nouveauLien = '';
  }

  supprimerLien(index: number): void {
    this.liensExternes.update(list => list.filter((_, i) => i !== index));
  }

  formatTaille(octets: number): string {
    if (octets >= 1024 * 1024) return `${(octets / 1024 / 1024).toFixed(1)} Mo`;
    return `${Math.round(octets / 1024)} Ko`;
  }

  // ── Envoi ──────────────────────────────────────────────────────
  envoyer(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.isSubmitting.set(true);
    this.successMsg.set('');
    this.errorMsg.set('');

    const { 
      type, titre, message, role,
      expire_le,
      demandeDocuments, demandeConfirmation 
    } = this.form.value;

    // Construire le champ data
    const data: Record<string, any> = {};
    if (demandeDocuments) {
      data['type_action'] = 'fournir_documents';
      data['label_bouton'] = 'Fournir les documents';
      data['documents_requis'] = this.documentsRequis();
    } else if (demandeConfirmation) {
      data['type_action'] = 'confirmer_action';
      data['label_bouton'] = 'Répondre';
      data['options'] = this.optionsArray.value;
    }

    const expireLeIso = expire_le ? `${expire_le}:00` : undefined;

    const base: EnvoyerNotifPayload = {
      type: type as NotificationType,
      titre: titre!,
      message: message!,
      data: Object.keys(data).length ? data : undefined,
      expire_le: expireLeIso
    };

    const fd = new FormData();
    fd.append('type',    type!);
    fd.append('titre',   titre!);
    fd.append('message', message!);
    if (expireLeIso) fd.append('expire_le', expireLeIso);
    if (Object.keys(data).length)  fd.append('data', JSON.stringify(data));
    if (this.liensExternes().length)
      fd.append('liens_externes', JSON.stringify(this.liensExternes()));

    // Fichiers PDF
    this.pdfsFichiers().forEach((f, i) => fd.append(`pdf_${i}`, f, f.name));

    let obs$: Observable<any>;

    switch (this.cible) {
      case 'user': {
        const uid = [...this.selectedUserIds()][0];
        if (!uid) { this._err('Sélectionnez un utilisateur.'); return; }
        fd.append('user_id', uid);
        obs$ = this.svc.envoyerFormData(fd, 'envoyer');
        break;
      }
      case 'multiple': {
        const ids = [...this.selectedUserIds()];
        if (!ids.length) { this._err('Sélectionnez au moins un utilisateur.'); return; }
        //obs$ = this.svc.envoyerMultiple({ ...base, user_ids: ids });
        fd.append('user_ids', JSON.stringify(ids));
        obs$ = this.svc.envoyerFormData(fd, 'envoyer_multiple');
        break;
      }
      case 'role': {
        if (!role) { this._err('Choisissez un rôle.'); return; }
        //obs$ = this.svc.envoyerParRole({ ...base, role: role! });
        fd.append('role', role!);
        obs$ = this.svc.envoyerFormData(fd, 'par_role');
        break;
      }
      case 'broadcast':
        //obs$ = this.svc.broadcast(base);
        obs$ = this.svc.envoyerFormData(fd, 'broadcast');
        break;
    }

    obs$!.subscribe({
      next: (res) => {
        this.successMsg.set(`Envoyé à ${res.count ?? 1} destinataire(s).`);
        this.isSubmitting.set(false);
        this._reset();
      },
      error: () => {
        this.errorMsg.set('Erreur lors de l\'envoi.');
        this.isSubmitting.set(false);
      }
    });
  }

  private _err(msg: string): void {
    this.errorMsg.set(msg);
    this.isSubmitting.set(false);
  }

  private _reset(): void {
    this.form.reset({ 
      type: 'INFO', 
      demandeDocuments: false, 
      demandeConfirmation: false,
      expire_le: null
    });
    this.optionsArray.clear();
    this.documentsRequis.set([]);
    this.selectedUserIds.set(new Set());
    this.pdfsFichiers.set([]);
    this.liensExternes.set([]);
  }

  get minDate(): string {
    return new Date().toISOString().slice(0, 16);
  }

  setExpire(jours: number): void {
    const d = new Date();
    d.setDate(d.getDate() + jours);
    d.setHours(23, 59, 0, 0);   // fin de journée par défaut
    this.form.get('expire_le')?.setValue(d.toISOString().slice(0, 16));
  }

  getTypeMeta(v: NotificationType) { return this.svc.getMeta(v); }
}
