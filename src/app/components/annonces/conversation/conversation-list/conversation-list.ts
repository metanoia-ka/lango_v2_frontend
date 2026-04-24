import { 
  Component, OnInit, OnDestroy, 
  Input, signal, computed, inject 
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { RelativeTimePipe } from '../../../../pipe/relative-time.pipe';
import { Conversation } from '../../models/conversation.model';
import { ConversationService } from '../../services/conversation.service';
import { StringToColorPipe } from '../../string-color.pipe';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';
import { ConversationNego } from '../conversation-nego/conversation-nego';


@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    RouterModule,
    NgbModule,
    RelativeTimePipe,
    StringToColorPipe
  ],
  templateUrl: './conversation-list.html',
  styleUrls: ['./conversation-list.scss'],
  providers: [DatePipe]
})
export class ConversationList implements OnInit, OnDestroy {
  @Input() annonceId!: string;
  @Input() isOwner: boolean = false;
  @Input() currentUser!: string; // Nom de l'utilisateur connecté

  conversations = signal<Conversation[]>([]);
  filteredConversations = signal<Conversation[]>([]);
  isLoading = signal(true);
  
  // Pour la modale de réponse
  selectedConversation = signal<Conversation | null>(null);
  replyMessage = signal('');
  isSendingReply = signal(false);

  private conversationService = inject(ConversationService);
  private confirmation = inject(ConfirmationService);
  
  private modalService = inject(NgbModal);
  private subscription = new Subscription();
  private datePipe = inject(DatePipe);

  // Signal calculé pour le nombre total de conversations
  totalConversations = computed(() => this.filteredConversations().length);

  ngOnInit(): void {
    if (this.annonceId && this.isOwner) {
      this.loadConversations();
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadConversations(): void {
    this.isLoading.set(true);

    this.subscription.add(
      this.conversationService.getConversations().subscribe({
        next: (data) => {
          // Filtrer les conversations pour cette annonce
          const annonceConversations = data.filter(
            conv => conv.annonce_id === this.annonceId
          );
          this.conversations.set(annonceConversations);
          this.filteredConversations.set(annonceConversations);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Erreur chargement conversations:', error);
          this.isLoading.set(false);
        }
      })
    );
  }

  // Ouvre la modale de réponse
  openReplyModal(conversation: Conversation, modalContent: any): void {
    this.selectedConversation.set(conversation);
    this.replyMessage.set('');
    
    this.modalService.open(modalContent, {
      size: 'md',
      centered: true,
      backdrop: 'static'
    });
  }

  onConversationNego() : void {
    const ref = this.modalService.open(ConversationNego, {
      centered: true, size: 'md', backdrop: 'static'
    })
  }

  // Envoie une réponse
  sendReply(modal: any): void {
    if (!this.replyMessage().trim() || !this.selectedConversation()) {
      return;
    }

    this.isSendingReply.set(true);

    const conversation = this.selectedConversation()!;
    
    this.subscription.add(
      this.conversationService.envoyerMessage(conversation.id, {
        contenu: this.replyMessage()
      }).subscribe({
        next: (message) => {
          // Mettre à jour la conversation avec le nouveau message
          const updatedConversations = this.conversations().map(conv => {
            if (conv.id === conversation.id) {
              return {
                ...conv,
                messages: [...(conv.messages || []), message],
                dernier_message: {
                  id: message.id,
                  auteur: message.auteur_nom,
                  contenu: message.contenu,
                  created_at: message.created_at
                },
                updated_at: message.created_at
              };
            }
            return conv;
          });

          //this.conversations.set(updatedConversations);
          //this.filteredConversations.set(updatedConversations);
          
          this.isSendingReply.set(false);
          this.replyMessage.set('');
          modal.close();
        },
        error: (error) => {
          console.error('Erreur envoi réponse:', error);
          this.isSendingReply.set(false);
        }
      })
    );
  }

  // Marquer une conversation comme lue
  markAsRead(conversation: Conversation): void {
    if (conversation.nb_messages_non_lus === 0) return;

    this.subscription.add(
      this.conversationService.marquerTousLus(conversation.id).subscribe({
        next: () => {
          const updatedConversations = this.conversations().map(conv => {
            if (conv.id === conversation.id) {
              return { ...conv, nb_messages_non_lus: 0 };
            }
            return conv;
          });
          this.conversations.set(updatedConversations);
          this.filteredConversations.set(updatedConversations);
        },
        error: (error) => console.error('Erreur marquage lu:', error)
      })
    );
  }

  // Fermer une conversation
  async closeConversation(conversation: Conversation, event: Event): Promise<void> {
    event.stopPropagation();

    const formattedDate = this.datePipe.transform(conversation.created_at, 'dd/MM/yyyy');

    const confirmed = await this.confirmation.confirm({
      title: 'Fermeture de la conversation',
      type: 'bg-warning',
      message: 'Voulez-vous fermer cette conversation ?',
      icon: 'bi-x-circle',
      confirmLabel: 'Oui, archiver',
      cancelLabel: 'Annuler',
      iconMessageSmall: '❔',
      iconMessageBig: '⚠️',
      zonePhraseOne: `Date of creation: ${formattedDate}`,
      zonePhraseTwo: `Owner of conversation: ${conversation.vendor_nom}`
    });

    if (!confirmed) return;

    this.subscription.add(
      this.conversationService.fermerConversation(conversation.id).subscribe({
        next: () => {
          const updatedConversations = this.conversations().map(conv => {
            if (conv.id === conversation.id) {
              return { ...conv, fermee: true };
            }
            return conv;
          });
          this.conversations.set(updatedConversations);
          this.filteredConversations.set(updatedConversations);
        },
        error: (error) => console.error('Erreur fermeture conversation:', error)
      })
    );
  }

  // Obtenir le nom de l'autre participant
  getOtherParticipant(conversation: Conversation): string {
    return conversation.est_vendor ? conversation.purchaser_nom : conversation.vendor_nom;
  }

  // Formater la date
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Obtenir les initiales pour l'avatar
  getInitials(name: string): string {
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  // Rafraîchir les conversations
  refresh(): void {
    this.loadConversations();
  }
}