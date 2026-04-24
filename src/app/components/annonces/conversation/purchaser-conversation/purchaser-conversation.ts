import { Component, inject, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { ConversationService } from '../../services/conversation.service';
import { Subscription } from 'rxjs';
import { Conversation, Message } from '../../models/conversation.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConversationNego } from '../conversation-nego/conversation-nego';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-purchaser-conversation',
  imports: [CommonModule, FormsModule],
  templateUrl: './purchaser-conversation.html',
  styleUrl: './purchaser-conversation.scss'
})
export class PurchaserConversation implements OnInit, OnDestroy{

  @Input() annonceId!: string;

  private conversationService = inject(ConversationService);

  private sub = new Subscription();
  private modal = inject(NgbModal);

  conversation = signal<Conversation | null>(null);
  messages = signal<Message[]>([]);
  isLoadingMessages = signal(false);
  isEnvoi = signal(false);
  nouveauMessage = '';

  ngOnInit(): void {
    this.chargerConversation();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private chargerConversation(): void {
    this.sub.add(
      this.conversationService.getConversations().subscribe({
        next: (conversations) => {
          // Trouver la conversation du Purchaser pour cette annonce
          const conv = conversations.find(c => c.annonce_id === this.annonceId);
          this.conversation.set(conv || null);

          if (conv) {
            this.chargerMessages(conv.id);
          }
        },
        error: (err) => console.error('Erreur chargement conversation:', err)
      })
    );
  }

  onConversationNego() : void {
    const ref = this.modal.open(ConversationNego, {
      centered: true, size: 'md', backdrop: 'static'
    })
  }

  private chargerMessages(conversationId: string): void {
    this.isLoadingMessages.set(true);
    this.sub.add(
      this.conversationService.getMessages(conversationId).subscribe({
        next: (messages) => {
          this.messages.set(messages);
          this.isLoadingMessages.set(false);
          this.scrollBas();
        },
        error: (err) => {
          console.error('Erreur chargement messages:', err);
          this.isLoadingMessages.set(false);
        }
      })
    );
  }

  envoyerMessage(): void {
    const conv = this.conversation();
    if (!conv || !this.nouveauMessage.trim()) return;

    this.isEnvoi.set(true);

    this.sub.add(
      this.conversationService.envoyerMessage(conv.id, {
        contenu: this.nouveauMessage.trim()
      }).subscribe({
        next: (message) => {
          // Ajouter le message localement sans recharger tout
          this.messages.update(msgs => [...msgs, message]);
          this.nouveauMessage = '';
          this.isEnvoi.set(false);
          this.scrollBas();
        },
        error: (err) => {
          console.error('Erreur envoi message:', err);
          this.isEnvoi.set(false);
        }
      })
    );
  }

  private scrollBas(): void {
    setTimeout(() => {
      const container = document.querySelector('.messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 50);
  }

  // Dans purchaser-conversation.component.ts

  isNewDay(date1: string, date2: string): boolean {
    return new Date(date1).toDateString() !== new Date(date2).toDateString();
  }

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

}
