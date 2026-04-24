import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NotifClient } from '../admin-notification.model';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { RouterModule } from '@angular/router';
import { 
  NotificationReponseService 
} from '../../../auth/features/notification/notification-reponse-service';


interface DocumentRequis {
  id:               string;
  nom:              string;
  description?:     string;
  obligatoire:      boolean;
  taille_max_mo?:   number;
  formats_acceptes?: string[];
}

interface OptionConfirmation {
  label:  string;
  valeur: string;
}


@Component({
  selector: 'app-notification-action-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './notification-action-modal.html',
  styleUrl: './notification-action-modal.scss'
})
export class NotificationActionModal implements OnInit {

  @Input() notification!: NotifClient;

  private activeModal = inject(NgbActiveModal);
  private svc = inject(NotificationReponseService);

  // ── Données extraites du data de la notif ─────────────────────
  typeAction:        string = '';
  documentsRequis:   DocumentRequis[] = [];
  options:           OptionConfirmation[] = [];
  labelBouton:       string = 'Envoyer';

  // ── État formulaire ───────────────────────────────────────────
  fichiersPourDoc:   Record<string, File> = {};    // doc.id → File
  choixSelectionne:  string = '';
  messageCommentaire: string = '';
  enCours:           boolean = false;

  // ── Méta affichage (couleur/icône par type) ───────────────────
  meta = { icone: 'bi-bell', couleur: '#6b7280', bg: '#f9fafb' };

  ngOnInit(): void {
    const data = this.notification.data ?? {};
    this.typeAction  = data['type_action'] ?? 'autre';
    this.labelBouton = data['label_bouton'] ?? 'Envoyer';

    if (this.typeAction === 'fournir_documents') {
      this.documentsRequis = data['documents_requis'] ?? [];
    }

    if (this.typeAction === 'confirmer_action') {
      this.options = data['options'] ?? [];
      if (this.options.length > 0) {
        this.choixSelectionne = this.options[0].valeur;
      }
    }

    this.meta = this._getMeta(this.notification.type);
  }

  // ── Validation : peut-on soumettre ? ─────────────────────────
  peutSoumettre(): boolean {
    if (this.typeAction === 'fournir_documents') {
      // Tous les documents obligatoires doivent être fournis
      return this.documentsRequis
        .filter(d => d.obligatoire)
        .every(d => !!this.fichiersPourDoc[d.id]);
    }
    if (this.typeAction === 'confirmer_action') {
      return !!this.choixSelectionne;
    }
    return true;
  }

  // ── Gestion fichier par document ─────────────────────────────
  onFichierChange(event: Event, docId: string): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (file) {
      this.fichiersPourDoc[docId] = file;
    } else {
      delete this.fichiersPourDoc[docId];
    }
  }

  // ── Soumission ────────────────────────────────────────────────
  soumettre(): void {
    if (!this.peutSoumettre() || this.enCours) return;
    this.enCours = true;

    // Construire le message selon le type
    let message = this.messageCommentaire;
    if (this.typeAction === 'confirmer_action' && this.choixSelectionne) {
      const opt = this.options.find(o => o.valeur === this.choixSelectionne);
      const prefixe = opt ? `Choix : ${opt.label}` : '';
      message = message ? `${prefixe}\n${message}` : prefixe;
    }

    // Fichiers dans l'ordre des documents
    const fichiers = Object.values(this.fichiersPourDoc);

    this.svc.repondre({
      notification_id: this.notification.id,
      action:          this.typeAction as any,
      message:         message || undefined,
      fichiers:        fichiers.length ? fichiers : undefined
    }).subscribe({
      next: (res) => {
        this.enCours = false;
        this.activeModal.close({ success: true, reponse_id: res.reponse_id });
      },
      error: () => { this.enCours = false; }
    });
  }

  getLabelBouton(): string { return this.labelBouton; }

  getAccept(formats?: string[]): string {
    if (!formats?.length) return '.pdf,.jpg,.jpeg,.png';
    return formats.map(f => `.${f}`).join(',');
  }

  close(): void { this.activeModal.dismiss('closed'); }

  private _getMeta(type: string) {
    const map: Record<string, { icone: string; couleur: string; bg: string }> = {
      VERIFICATION:    { icone: 'bi-shield-check',          couleur: '#3b82f6', bg: '#eff6ff' },
      CORRECTION:      { icone: 'bi-exclamation-triangle',  couleur: '#f59e0b', bg: '#fffbeb' },
      VALIDATION:      { icone: 'bi-check-circle',          couleur: '#008753', bg: '#f0fdf4' },
      REJET:           { icone: 'bi-x-circle',              couleur: '#ef4444', bg: '#fef2f2' },
      DOCUMENT_REQUIS: { icone: 'bi-file-earmark-arrow-up', couleur: '#7c3aed', bg: '#f5f3ff' },
      ACTION_REQUISE:  { icone: 'bi-hand-index',            couleur: '#f97316', bg: '#fff7ed' },
      INFO:            { icone: 'bi-info-circle',           couleur: '#6366f1', bg: '#eef2ff' },
    };
    return map[type] ?? { icone: 'bi-bell', couleur: '#6b7280', bg: '#f9fafb' };
  }
}
