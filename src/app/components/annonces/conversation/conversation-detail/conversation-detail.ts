import { CommonModule } from '@angular/common';
import { 
  Component, ElementRef, 
  inject, OnDestroy, OnInit, 
  signal, ViewChild 
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ConversationService } from '../../services/conversation.service';
import { ToastrService } from 'ngx-toastr';
import { CreateMessage } from '../../models/conversation.model';

@Component({
  selector: 'app-conversation-detail',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './conversation-detail.html',
  styleUrl: './conversation-detail.scss'
})
export class ConversationDetail implements OnInit, OnDestroy {

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef;

  private route = inject(ActivatedRoute);
  private conversationService = inject(ConversationService);
  private toastr = inject(ToastrService);

  // Signaux
  conversation = this.conversationService.conversationActive;
  messages = this.conversationService.messages;
  isLoading = signal(true);
  isSending = signal(false);

  // Formulaire message
  messageTexte = signal('');
  fichierSelectionne = signal<File | null>(null);

  // Polling pour nouveaux messages
  private pollingInterval: any;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadConversation(id);
      this.loadMessages(id);
      this.startPolling(id);
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  loadConversation(id: string): void {
    this.conversationService.getConversation(id).subscribe({
      next: () => this.isLoading.set(false),
      error: (err) => {
        this.toastr.error('Conversation introuvable', err);
        this.isLoading.set(false);
      }
    });
  }

  loadMessages(id: string): void {
    this.conversationService.getMessages(id).subscribe({
      next: () => {
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (err) => console.error('Erreur messages:', err)
    });
  }

  envoyerMessage(): void {
    const texte = this.messageTexte().trim();
    const fichier = this.fichierSelectionne();

    if (!texte && !fichier) {
      this.toastr.warning('Veuillez écrire un message ou joindre un fichier');
      return;
    }

    if (this.conversation()?.fermee) {
      this.toastr.error('Cette conversation est fermée');
      return;
    }

    this.isSending.set(true);

    const messageData: CreateMessage = {
      contenu: texte || '(Fichier joint)',
      fichier: fichier || undefined
    };

    this.conversationService.envoyerMessage(
      this.conversation()!.id, messageData
    ).subscribe({
      next: () => {
        this.messageTexte.set('');
        this.fichierSelectionne.set(null);
        if (this.fileInput) {
          this.fileInput.nativeElement.value = '';
        }
        this.loadMessages(this.conversation()!.id);
        this.isSending.set(false);
      },
      error: (err) => {
        this.toastr.error('Erreur lors de l\'envoi');
        this.isSending.set(false);
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Vérifier taille (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        this.toastr.error('Le fichier ne doit pas dépasser 5 MB');
        return;
      }
      this.fichierSelectionne.set(file);
    }
  }

  retirerFichier(): void {
    this.fichierSelectionne.set(null);
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  fermerConversation(): void {
    if (!confirm('Voulez-vous vraiment fermer cette conversation ?')) return;

    this.conversationService.fermerConversation(this.conversation()!.id).subscribe({
      next: (result) => {
        this.toastr.info(result.message);
        this.loadConversation(this.conversation()!.id);
      },
      error: (err) => {
        this.toastr.error('Erreur lors de la fermeture');
      }
    });
  }

  scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = 
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  startPolling(conversationId: string): void {
    // Recharger les messages toutes les 5 secondes
    this.pollingInterval = setInterval(() => {
      this.conversationService.getMessages(conversationId).subscribe();
    }, 5000);
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  getTempsEcoule(date: string): string {
    const maintenant = new Date().getTime();
    const dateMsg = new Date(date).getTime();
    const diff = maintenant - dateMsg;

    const minutes = Math.floor(diff / 60000);
    const heures = Math.floor(diff / 3600000);
    const jours = Math.floor(diff / 86400000);

    if (jours > 0) return `${jours}j`;
    if (heures > 0) return `${heures}h`;
    if (minutes > 0) return `${minutes}min`;
    return 'maintenant';
  }

  formatTailleFichier(taille: number): string {
    if (taille < 1024) return `${taille} B`;
    if (taille < 1024 * 1024) return `${(taille / 1024).toFixed(1)} KB`;
    return `${(taille / (1024 * 1024)).toFixed(1)} MB`;
  }

}
