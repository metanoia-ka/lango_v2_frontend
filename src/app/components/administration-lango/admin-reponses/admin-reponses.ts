import { 
  Component, EventEmitter, 
  inject, Input, OnInit, 
  Output, signal 
} from '@angular/core';
import { 
  NotificationReponseService 
} from '../../../auth/features/notification/notification-reponse-service';
import { 
  NotificationReponse 
} from '../../../auth/features/notification/notification-reponse.model';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-reponses',
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-reponses.html',
  styleUrl: './admin-reponses.scss'
})
export class AdminReponses implements OnInit{

  @Input() notificationId!: string;
  @Output() toutesTraitees = new EventEmitter<void>()

  private svc = inject(NotificationReponseService);

  reponses = signal<NotificationReponse[]>([]);
  isLoading = true;
  traitementEnCours: Record<string, boolean> = {};

  ngOnInit(): void {
    this.svc.listerReponses(this.notificationId).subscribe({
      next: data => {
        this.reponses.set(data);
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  traiter(rep: NotificationReponse): void {
    this.traitementEnCours[rep.id] = true;

    this.svc.traiterReponse(rep.id).subscribe({
      next: (res) => {
        // Mettre à jour localement sans recharger
        this.reponses.update(list =>
          list.map(r => r.id === rep.id
            ? { ...r, traitee: true, traitee_le: res.traitee_le }
            : r
          )
        );
        this.traitementEnCours[rep.id] = false;

        const toutesTraitees = this.reponses().every(r => r.traitee);
        if (toutesTraitees) this.toutesTraitees.emit();
      },
      error: () => { this.traitementEnCours[rep.id] = false; }
    });
  }

  getActionLabel(action: string): string {
    const map: Record<string, string> = {
      fournir_documents:    'Documents fournis',
      confirmer_action:     'Action confirmée',
      ouvrir_conversation:  'Conversation',
      autre:                'Autre',
    };
    return map[action] ?? action;
  }

  getFileIcon(mimeType: string): string {
    if (mimeType.includes('pdf'))   return 'bi-file-earmark-pdf';
    if (mimeType.includes('image')) return 'bi-file-earmark-image';
    if (mimeType.includes('word'))  return 'bi-file-earmark-word';
    return 'bi-file-earmark';
  }

  parseMessage(message: string | null): {
    type: 'confirmation' | 'texte' | 'vide';
    choix?: string;
    commentaire?: string;
    texte?: string;
  } {
    if (!message || message.trim() === '') {
      return { type: 'vide' };
    }

    try {
      const parsed = JSON.parse(message);
      // Cas confirmer_action : { choix: "oui", commentaire: "" }
      if (parsed && typeof parsed === 'object' && 'choix' in parsed) {
        return {
          type:        'confirmation',
          choix:       parsed.choix       || '',
          commentaire: parsed.commentaire || '',
        };
      }
      // Autre JSON → afficher en texte brut formaté
      return { type: 'texte', texte: JSON.stringify(parsed, null, 2) };
    } catch {
      // Texte libre normal
      return { type: 'texte', texte: message };
    }
  }

  getChoixLabel(choix: string): string {
    const map: Record<string, string> = {
      oui:  'Oui',
      non:  'Non',
      '':   '—',
    };
    return map[choix.toLowerCase()] ?? choix;
  }

  /**
   * Couleur selon le choix
   */
  getChoixStyle(choix: string): { background: string; color: string } {
    const c = choix.toLowerCase();
    if (['oui', 'yes', 'je confirme', 'confirme', 'ok'].includes(c)) {
      return { background: '#e6f4ee', color: '#008753' };
    }
    if (['non', 'no', 'je refuse', 'refuse', 'indisponible'].includes(c)) {
      return { background: '#fef2f2', color: '#dc2626' };
    }
    return { background: '#f5f3ff', color: '#7c3aed' };
  }
}
