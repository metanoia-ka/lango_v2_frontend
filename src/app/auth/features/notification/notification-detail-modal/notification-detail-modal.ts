import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { 
  DocumentRequis, 
  NOTIFICATION_TYPES, 
  NotificationActionType, 
  NotificationClient 
} from '../notification-model';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { SNotification } from '../notification-service';
import { Router, RouterModule } from '@angular/router';
import { 
  ConfirmationService 
} from '../../../../components/confirmation-modal/service/confirmation';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { 
  AdminReponses 
} from '../../../../components/administration-lango/admin-reponses/admin-reponses';

interface TypeConfig {
  icon:  string;
  label: string;
  color: string;
  bg:    string;
}

interface SlotDoc {
  doc: DocumentRequis;
  fichier: File | null;
  erreur: string;
}

@Component({
  selector: 'app-notification-detail-modal',
  imports: [CommonModule, ReactiveFormsModule, AdminReponses, RouterModule],
  templateUrl: './notification-detail-modal.html',
  styleUrl: './notification-detail-modal.scss',
  providers: [DatePipe]
})
export class NotificationDetailModal implements OnInit {

  //@Input() notification!: NotificationClient;

  @Input() set notification(value: NotificationClient) {
    this._notifData.set(value);
  }
  
  get notification(): NotificationClient {
    return this._notifData();
  }

  private _notifData = signal<NotificationClient>({} as NotificationClient);
  notifData = this._notifData.asReadonly();
  
  private activeModal = inject(NgbActiveModal);
  private router = inject(Router);
  private datePipe = inject(DatePipe);
  private fb = inject(FormBuilder);

  private notifService = inject(SNotification);
  private confirmation = inject(ConfirmationService);

  responseType: 'success' | 'error' = 'success';
  successMessage: string = '';
  errorMessage: string | null = null;

  //isSubmitting = false;
  isLoading: boolean = false;
  private _marquageLanceDB = false;

  isSubmitting = signal(false);
  successMsg = signal('');
  errorMsg = signal('');

  notificationTypes = NOTIFICATION_TYPES;

  // Pour fournir_documents
  slots = signal<SlotDoc[]>([]);

  // Pour confirmer_action
  confirmForm = this.fb.group({
    choix: ['', Validators.required],
    commentaire: ['']
  });

  ngOnInit(): void {
    if (this.typeAction === 'fournir_documents') {
      this.slots.set(
        this.docs.map(d => ({ doc: d, fichier: null, erreur: '' }))
      );
    }

    if (!this.notification.lue && !this._marquageLanceDB) {
      this._marquageLanceDB = true;

      this.notifService.markAsRead(this.notification.id).subscribe({
        next: (notifMaj) => {
          this._notifData.update(n => ({
            ...n,
            lue:          true,
            date_lecture: notifMaj.date_lecture ?? new Date().toISOString()
          }));
        }
      });
    }
  }

  /** True si la notification a une date d'expiration définie */
  get aExpiration(): boolean {
    return !!this.notification?.expire_le;
  }

  /** True si la notification est déjà expirée */
  get estExpiree(): boolean {
    if (!this.notification?.expire_le) return false;
    return new Date(this.notification.expire_le) < new Date();
  }

  /** True si expire dans moins de 24h (urgence) */
  get expireBientot(): boolean {
    if (!this.notification?.expire_le || this.estExpiree) return false;
    const diff = new Date(this.notification.expire_le).getTime() - Date.now();
    return diff < 24 * 60 * 60 * 1000;
  }

  /** Classe CSS selon l'état d'expiration */
  get expirationClass(): string {
    if (this.estExpiree)    return 'expiry-expired';
    if (this.expireBientot) return 'expiry-soon';
    return 'expiry-normal';
  }

  // ── FIX deja_repondu : désactiver le formulaire si déjà répondu ──
  get dejaRepondu(): boolean {
    return this.notification?.deja_repondu === true;
  }

  get estVoirReponse(): boolean {
    return this.typeAction === 'voir_reponse' as NotificationActionType;
  }

  get notificationSourceId(): string | null {
    return this.notification?.data?.['notification_id'] ?? null;
  }

  // ── Gestion fichiers ──────────────────────────────────────────
  onFichier(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    const slot = this.slots()[index];
    let erreur = '';

    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      const formats = slot.doc.formats_acceptes;
      if (formats.length && !formats.includes(ext)) {
        erreur = `Format non accepté. Utilisez : ${formats.join(', ').toUpperCase()}`;
        input.value = '';
      } else if (
        slot.doc.taille_max_mo && file.size > slot.doc.taille_max_mo * 1024 * 1024
      ) {
        erreur = `Fichier trop lourd (max ${slot.doc.taille_max_mo} Mo)`;
        input.value = '';
      }
    }

    this.slots.update(list => {
      const copy = [...list];
      copy[index] = { ...slot, fichier: erreur ? null : file, erreur };
      return copy;
    });
  }

  get typeAction() { return this.notification?.data?.type_action; }
  get meta() { return this.notifService.getMeta(this.notification?.type); }
  get docs() { return this.notification?.data?.documents_requis ?? []; }
  get options() { return this.notification?.data?.options ?? []; }

  /**
   * Marquer comme lu et fermer
   */
  markAsReadAndClose(): void {
    if (!this.notification.lue) {
      this.notifService.markAsRead(this.notification.id).subscribe({
        next: () => {
          this.activeModal.close('read');
        }
      });
    } else {
      this.activeModal.close();
    }
  }

  goToLink(): void {
    if (this.notification.lien) {
      this.activeModal.close('link');
      this.router.navigateByUrl(this.notification.lien);
    }
  }

  close(): void {
    this.activeModal.dismiss('closed');
  }

  /**
    * Ouvre une modale de confirmation avant de supprimer un géomètre.
    * @param userId L'ID du géomètre à supprimer.
    */
  async onDelete(notif: NotificationClient) {
  
    const formattedDate = this.datePipe.transform(notif.date_creation, 'dd/MM/yyyy');
  
    const confirmed = await this.confirmation.confirm({
      title: 'Confirmation de suppression',
      type: 'bg-danger',
      message: `Êtes-vous sûr de vouloir supprimer cette notification: ${notif.titre} ?`,
      icon: 'bi-trash',
      iconMessageSmall: '⚠️',
      iconMessageBig: '❌',
      confirmLabel: 'Oui, supprimer',
      cancelLabel: 'Annuler',
      zonePhraseThree: `Date d'envoi de la notification: ${formattedDate}`
    });
  
    if (!confirmed) return;
  
    try {
      this.onDeleteModal(notif.id);
      setTimeout(() => {
        this.activeModal.dismiss('dismiss');
      }, 500);
    } finally {}
  }
  
  /**
   * Supprimer la notification
   */
  deleteNotification(): void {
    this.notifService.deleteNotification(this.notification.id).subscribe({
      next: () => {
        this.activeModal.close('deleted');
      }
    });
  }

  onDeleteModal(user_id: string) {
    this.notifService.deleteNotification(user_id).subscribe({
      next: () => {
        this.successMessage = '📥 Notification supprimée avec succès. !';
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = `❌ Erreur lors de la suppression de la notification: 
          (status: ${err.status}) -> (message: ${err.statusText})`;
        this.responseType = 'error';
        this.isLoading = false;
      }
    });
  }

  hasData(): boolean {
    if (!this.notification?.data) return false;
    const d = this.notification.data;
    // Exclure les champs type_action qui sont déjà gérés par la modale d'action
    const keys = Object.keys(d).filter(k => k !== 'type_action');
    return keys.length > 0;
  }

  tousObligatoiresRemplis(): boolean {
    return this.slots().every(s => !s.doc.obligatoire || s.fichier !== null);
  }

  // ── Soumission ────────────────────────────────────────────────
  soumettre(): void {

    if (this.dejaRepondu) return;

    if (this.typeAction === 'fournir_documents') {
      this._soumettreDocuments();
    } else if (this.typeAction === 'confirmer_action') {
      this._soumettreConfirmation();
    }
  }

  private _soumettreDocuments(): void {
    if (!this.tousObligatoiresRemplis()) return;
    this.isSubmitting.set(true);

    const fichiers = this.slots().filter(s => s.fichier).map(s => s.fichier!);
    this.notifService.repondre({
      notification_id: this.notification.id,
      action: 'fournir_documents',
      fichiers
    }).subscribe({
      next: () => {
        this.successMsg.set('Documents envoyés avec succès !');
        this.isSubmitting.set(false);

        this._marquerRepondu();
        setTimeout(() => this.activeModal.close('submitted'), 1500);
      },
      error: (err) => {
        if (err.status === 409) {
          this.errorMsg.set('Vous avez déjà répondu à cette notification.');
          this._marquerRepondu();
        } else {
          this.errorMsg.set('Erreur lors de l\'envoi. Veuillez réessayer.');
        }
        this.isSubmitting.set(false);
      }
    });
  }

  private _soumettreConfirmation(): void {
    if (this.confirmForm.invalid) { this.confirmForm.markAllAsTouched(); return; }
    this.isSubmitting.set(true);

    this.notifService.repondre({
      notification_id: this.notification.id,
      action: 'confirmer_action',
      message: JSON.stringify(this.confirmForm.value)
    }).subscribe({
      next: () => {
        this.successMsg.set('Réponse enregistrée !');
        this.isSubmitting.set(false);

        this._marquerRepondu();
        setTimeout(() => this.activeModal.close('confirmed'), 1500);
      },
      error: (err) => {
        if (err.status === 409) {
          this.errorMsg.set('Vous avez déjà répondu à cette notification.');
          this._marquerRepondu();
        } else {
          this.errorMsg.set('Erreur. Veuillez réessayer.');
        }
        this.isSubmitting.set(false);
      }
    });
  }

  /** Met à jour le signal global + l'objet local après réponse réussie */
  private _marquerRepondu(): void {
    this.notification = { ...this.notification, deja_repondu: true };
    // Propager dans le signal global pour que le dropdown se mette à jour
    this.notifService.notifications.update(list =>
      list.map(n => n.id === this.notification.id
        ? { ...n, deja_repondu: true }
        : n
      )
    );
  }

  goToAnnonce() {
    this.activeModal.close();
    setTimeout(() => {
      this.router.navigate([
        '/lango/annonces', 
        this.notification.data?.annonce_id, 
        'detail'
      ]);
    }, 0);
  }

  getAcceptFormats(slot: any): string {

    if (!slot?.doc.formats_acceptes) return '';

    return slot.doc.formats_acceptes
          .map((f: string) => '.' + f)
          .join(',');
  }

  // ── Config visuelle par type ──────────────────────────────────
  getTypeConfig(): TypeConfig {
    const map: Record<string, TypeConfig> = {
      VERIFICATION: 
      { icon: 'bi-shield-check', 
        label: 'Vérification', 
        color: '#3b82f6', 
        bg: '#b0c0d4'  
      },
      CORRECTION: 
      { icon: 'bi-exclamation-triangle', 
        label: 'Correction demandée', 
        color: '#f59e0b', 
        bg: '#ebd88f'  
      },
      VALIDATION: 
      { icon: 'bi-check-circle', 
        label: 'Validation', 
        color: '#008753', 
        bg: '#aef3c3'  
      },
      REJET: 
      { icon: 'bi-x-circle', 
        label: 'Rejet', 
        color: '#ef4444', 
        bg: '#eec5c5'  
      },
      INFO: 
      { icon: 'bi-info-circle', 
        label: 'Information', 
        color: '#6366f1', 
        bg: '#c5cff1'  
      },
      SYSTEM: 
      { icon: 'bi-gear', 
        label: 'Système', 
        color: '#6b7280', 
        bg: '#bcc2c9'  
      },
      DOCUMENT_REQUIS: 
      { icon: 'bi-file-earmark-arrow-up', 
        label: 'Documents requis', 
        color: '#7c3aed', 
        bg: '#c4bfdd'  
      },
      ACTION_REQUISE:  
      { icon: 'bi-hand-index', 
        label: 'Action requise', 
        color: '#f97316', 
        bg: '#f7e4cd'  
      },
      RAPPEL: 
      { icon: 'bi-alarm', 
        label: 'Rappel', 
        color: '#0891b2', 
        bg: '#cff5f7'  
      },
      RENDEZ_VOUS:
      {
        label: 'Rendez-vous', 
        icon: 'bi-calendar-check', 
        color: '#0f1111',
        bg: '#f9fafb' 
      },
      PROMOTION:
      { label: 'Promotion', 
        icon: 'bi-megaphone', 
        color: '#111c79',
        bg: '#f9fafb' 
      },
      ALERTE:
      { label: 'Alerte', 
      icon: 'bi-exclamation-triangle', 
      color: '#cc0631',
      bg: '#f9fafb'  
      },
      MESSAGE:
      { label: 'Message', 
        icon: 'bi-chat-dots', 
        color: '#5319f3',
        bg: '#f9fafb'  
      }
    };
    return map[this.notification?.type] ?? {
      icon: 'bi-bell', label: this.notification?.type ?? '—',
      color: '#6b7280', bg: '#f9fafb'
    };
  }

}
