import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environnement } from '../../../../environnements/environnement';
import { 
  Conversation, 
  CreateConversation, 
  CreateMessage, 
  EnvoyerOffrePayload, 
  Message, 
  OffrePrix,
  RepondreOffrePayload
} from '../models/conversation.model';

@Injectable({
  providedIn: 'root'
})
export class ConversationService {
  private http = inject(HttpClient);
  private apiUrl = `${environnement.apiBaseUrl}/conversations`;

  // Signaux réactifs
  conversations = signal<Conversation[]>([]);
  conversationActive = signal<Conversation | null>(null);
  messages = signal<Message[]>([]);
  nbNonLus = signal(0);

  /**
   * Liste de mes conversations
   */
  getConversations(): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(
      this.apiUrl + '/', { withCredentials: true }
    ).pipe(
      tap(conversations => {
        this.conversations.set(conversations);
        // Calculer le total de messages non lus
        const total = conversations.reduce(
          (acc, conv) => acc + conv.nb_messages_non_lus, 0
        );
        this.nbNonLus.set(total);
      }),
      catchError(err => {
        return throwError(() => err)
      })
    );
  }

  getConversationsByAnnonce(
    annonceId: string
  ): Observable<{conversations: Conversation[]}> {
    return this.http.get<{conversations: Conversation[]}>(
      `${this.apiUrl}/by-annonce/${annonceId}/`, { withCredentials: true }
    );
  }

  /**
   * Détail d'une conversation
   */
  getConversation(id: string): Observable<Conversation> {
    return this.http.get<Conversation>(
      `${this.apiUrl}/${id}/`, { withCredentials: true }
    ).pipe(
      tap(conversation => this.conversationActive.set(conversation)),
      catchError(err => {
        return throwError(() => err)
      })
    );
  }

  /**
   * Créer une conversation (Purchaser)
   */
  createConversation(data: CreateConversation): Observable<Conversation> {
    return this.http.post<Conversation>(
      this.apiUrl + '/', data, { withCredentials: true }
    );
  }

  /**
   * Fermer une conversation
   */
  //fermerConversation(id: string): Observable<{
  //  message: string;
  //  conversation: Conversation;
  //}> {
  //  return this.http.post<{message: string; conversation: Conversation}>(
  //    `${this.apiUrl}/${id}/close/`,
  //    {}, { withCredentials: true }
  //  );
  //}

  // ============================================================================
  // MESSAGES
  // ============================================================================

  /**
   * Liste des messages d'une conversation
   */
  getMessages(conversationId: string): Observable<Message[]> {
    return this.http.get<Message[]>(
      `${this.apiUrl}/${conversationId}/messages/`, { withCredentials: true }
    ).pipe(
      tap(messages => this.messages.set(messages)),
      catchError(err => {
        return throwError(() => err)
      })
    );
  }

  /**
   * Envoyer un message
   */
  envoyerMessage(conversationId: string, message: CreateMessage): Observable<Message> {
    const formData = new FormData();
    formData.append('contenu', message.contenu);
    if (message.fichier) {
      formData.append('fichier', message.fichier);
    }

    return this.http.post<Message>(
      `${this.apiUrl}/${conversationId}/messages/`,
      formData, { withCredentials: true }
    );
  }

  /**
   * Modifier un message (dans les 5 min)
   */
  modifierMessage(
    conversationId: string,
    messageId: string,
    contenu: string
  ): Observable<Message> {
    return this.http.patch<Message>(
      `${this.apiUrl}/${conversationId}/messages/${messageId}/`,
      { contenu }, { withCredentials: true }
    );
  }

  /**
   * Supprimer un message (dans les 5 min)
   */
  supprimerMessage(conversationId: string, messageId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${conversationId}/messages/${messageId}/`, { withCredentials: true }
    );
  }

  /**
   * Marquer un message comme lu
   */
  marquerLu(conversationId: string, messageId: string): Observable<{
    message: string;
    data: Message;
  }> {
    return this.http.post<{message: string; data: Message}>(
      `${this.apiUrl}/${conversationId}/messages/${messageId}/marquer-lu/`,
      {}, { withCredentials: true }
    );
  }

  /**
   * Marquer tous les messages comme lus
   */
  marquerTousLus(conversationId: string): Observable<{
    message: string;
    count: number;
  }> {
    return this.http.post<{message: string; count: number}>(
      `${this.apiUrl}/${conversationId}/messages/marquer-tous-lus/`,
      {}, { withCredentials: true }
    );
  }

  /**
   * Messages non lus d'une conversation
   */
  getMessagesNonLus(conversationId: string): Observable<{
    count: number;
    messages: Message[];
  }> {
    return this.http.get<{count: number; messages: Message[]}>(
      `${this.apiUrl}/${conversationId}/messages/non-lus/`, { withCredentials: true }
    );
  }

  /**
   * Statistiques des messages
   */
  getStatistiques(conversationId: string): Observable<{
    total_messages: number;
    messages_envoyes: number;
    messages_recus: number;
    messages_non_lus: number;
    messages_avec_fichiers: number;
  }> {
    return this.http.get<any>(
      `${this.apiUrl}/${conversationId}/messages/statistiques/`, 
      { withCredentials: true }
    );
  }

  getOffresPrix(conversationId: string): Observable<OffrePrix[]> {
    return this.http.get<OffrePrix[]>(
      `${this.apiUrl}/${conversationId}/offres-prix/`,
      { withCredentials: true }
    );
  }

  envoyerOffre(
    conversationId: string, payload: EnvoyerOffrePayload
  ): Observable<OffrePrix> {
    return this.http.post<OffrePrix>(
      `${this.apiUrl}/${conversationId}/envoyer-offre/`,
      payload,
      { withCredentials: true }
    );
  }

  repondreOffre(
    conversationId: string, offreId: string, payload: RepondreOffrePayload
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${conversationId}/repondre-offre/${offreId}/`,
      payload,
      { withCredentials: true }
    );
  }

  fermerConversation(conversationId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/${conversationId}/fermer/`,
      {},
      { withCredentials: true }
    );
  }
}