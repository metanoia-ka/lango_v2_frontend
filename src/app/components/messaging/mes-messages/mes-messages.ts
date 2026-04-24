import { CommonModule, DatePipe, getLocaleDateTimeFormat } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessagingService } from '../services/messaging';
import { Message, MessageStatut } from '../models/messaging.models';
import { ConfirmationService } from '../../confirmation-modal/service/confirmation';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MessagingForm } from '../messaging-form/messaging-form';

@Component({
  selector: 'app-mes-messages',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterModule],
  templateUrl: './mes-messages.html',
  styleUrl: './mes-messages.scss'
})
export class MesMessages implements OnInit, OnDestroy {

  private svc      = inject(MessagingService);
  private confirmation = inject(ConfirmationService);
  
  private readonly modal = inject(NgbModal);
  
  private destroy$ = new Subject<void>();

  messages  = this.svc.mesMessages;
  loading   = signal(true);
  error     = signal<string | null>(null);
  selected  = signal<Message | null>(null);

  ngOnInit(): void {
    this.loadMyMessages();
  }

  private loadMyMessages(): void {
    this.loading.set(true);
    this.svc.getMesMessages()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.loading.set(false),
        error: () => {
          this.error.set('Impossible de charger vos messages.');
          this.loading.set(false);
        }
      });
  }

  contactTeam(): void {
    const ref = this.modal.open(MessagingForm, { size: 'lg', centered: true });
    ref.result.then(r => { 
      if (r === 'saved') {
        this.loadMyMessages();
        this.confirmation.inform({
          context: 'create',
          title:   'Contacter l\'équipe',
          type:    'bg-success',
          closeLabel: 'Ok',
          message: `
          Merci de nous avoir contactés. Votre demande a bien été enregistrée et
          notre équipe vous répondra dans les meilleurs délais.`,
        });
      }
    }, () => {});
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectionner(msg: Message): void {
    this.selected.set(this.selected()?.id === msg.id ? null : msg);
  }

  statutClass(statut: MessageStatut): string {
    const m: Record<MessageStatut, string> = {
      NOUVEAU:  'badge-nouveau',
      LU:       'badge-lu',
      REPONDU:  'badge-repondu',
      ARCHIVE:  'badge-archive',
    };
    return m[statut] ?? '';
  }

  statutLabel(statut: MessageStatut): string {
    const m: Record<MessageStatut, string> = {
      NOUVEAU:  'Envoyé',
      LU:       'Lu par l\'équipe',
      REPONDU:  'Répondu',
      ARCHIVE:  'Archivé',
    };
    return m[statut] ?? statut;
  }

  trackById(_: number, m: Message): string { return m.id; }

}
