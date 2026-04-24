import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { 
  FormBuilder, 
  FormControl, 
  FormGroup, 
  ReactiveFormsModule, 
  Validators 
} from '@angular/forms';
import { MessagingService } from '../services/messaging';
import { PresenceService } from '../services/personne';
import { Message, MessageStatut } from '../models/messaging.models';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';
import { ConfirmationService } from '../../confirmation-modal/service/confirmation';

@Component({
  selector: 'app-admin-messaging',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './admin-messaging.html',
  styleUrl: './admin-messaging.scss'
})
export class AdminMessaging implements OnInit, OnDestroy {

  private svc                 = inject(MessagingService);
  private presence            = inject(PresenceService);
  private confirmation        = inject(ConfirmationService);

  private fb       = inject(FormBuilder);

  // ── État ──────────────────────────────────────────────────────────────────
  messages      = this.svc.messages;
  stats         = this.svc.stats;
  loading       = this.svc.loading;
  error         = this.svc.error;

  // Message sélectionné pour le panel inline
  selectedMessage = signal<Message | null>(null);
  detailLoading    = signal(false);
  replyLoading    = signal(false);
  replySuccess    = signal(false);
  replyError      = signal<string | null>(null);

  // Prévisualisation pièce jointe
  previewUrl    = signal<string | null>(null);
  previewType   = signal<'image' | 'pdf' | null>(null);
  previewNom    = signal<string | null>(null);

  // Filtres
  statutFilter  = new FormControl<MessageStatut | ''>('');
  searchCtrl    = new FormControl('');

  // Formulaire réponse inline
  replyForm!: FormGroup;

  // Statuts disponibles
  readonly STATUTS: { label: string; value: MessageStatut | '' }[] = [
    { label: 'Tous',     value: '' },
    { label: 'Nouveau',  value: 'NOUVEAU' },
    { label: 'Lu',       value: 'LU' },
    { label: 'Répondu',  value: 'REPONDU' },
    { label: 'Archivé',  value: 'ARCHIVE' },
  ];

  private destroy$ = new Subject<void>();

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.replyForm = this.fb.group({
      contenu: ['', [Validators.required, Validators.minLength(5)]]
    });

    this._charger();

    // Filtres réactifs
    this.statutFilter.valueChanges.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => this._charger());

    this.searchCtrl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => this._charger());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Chargement ────────────────────────────────────────────────────────────
  private _charger(): void {
    const statut = this.statutFilter.value as MessageStatut | undefined;
    const search = this.searchCtrl.value ?? undefined;
    this.svc.getAll(statut || undefined, search || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe();
    this.svc.getStats().pipe(takeUntil(this.destroy$)).subscribe();
  }

  // ── Sélection d'un message — charge le DÉTAIL COMPLET ────────────────────
  // La liste utilise MessageListSerializer (pas de `contenu` ni `reponses`).
  // Il faut appeler getById() pour avoir le détail complet.
  selectionner(msg: Message): void {
    this.selectedMessage.set(msg);
    this.replyForm.reset();
    this.replySuccess.set(false);
    this.replyError.set(null);
    this.fermerPreview();
    this.detailLoading.set(true);

    this.svc.getById(msg.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (detail) => {
          this.selectedMessage.set(detail);
          this.detailLoading.set(false);
 
          // Marquer lu automatiquement si NOUVEAU
          if (detail.statut === 'NOUVEAU') {
            this.svc.marquerLu(detail.id)
              .pipe(takeUntil(this.destroy$))
              .subscribe(() => {
                // Mettre à jour le statut dans le panel et la liste
                this.selectedMessage.update(m =>
                  m ? { ...m, statut: 'LU' as MessageStatut } : m
                );
                this._charger();
              });
          }
        },
        error: () => {
          this.detailLoading.set(false);
          this.selectedMessage.set(msg); // fallback sur les données partielles
        }
      });
  }

  fermerPanel(): void {
    this.selectedMessage.set(null);
    this.fermerPreview();
  }

  // ── Réponse inline ────────────────────────────────────────────────────────
  envoyerReponse(): void {
    if (this.replyForm.invalid || this.replyLoading()) return;
    const msg = this.selectedMessage();
    if (!msg) return;

    this.replyLoading.set(true);
    this.replyError.set(null);

    this.svc.repondre(msg.id, this.replyForm.value.contenu)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.replySuccess.set(true);
          this.replyLoading.set(false);
          this.replyForm.reset();
          // Recharger le message pour voir la nouvelle réponse
          this.svc.getById(msg.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe(updated => this.selectedMessage.set(updated));
          this._charger();
        },
        error: (err) => {
          this.replyError.set(err.error?.detail ?? 'Erreur lors de l\'envoi.');
          this.replyLoading.set(false);
        }
      });
  }

  async archiverMessage(message: Message, event: Event): Promise<void> {
    const ok = await this.confirmation.confirm({
      title: 'Archiver le message', type: 'bg-secondary',
      message: 'Le message sera retiré de la liste.',
      icon: 'bi-archive', confirmLabel: 'Archiver', cancelLabel: 'Annuler',
    });
    if (!ok) return;
    this.archiver(message, event);
  }

  // ── Archiver ──────────────────────────────────────────────────────────────
  archiver(msg: Message, event: Event): void {
    event.stopPropagation();
    this.svc.archiver(msg.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.selectedMessage()?.id === msg.id) {
          this.fermerPanel();
        }
        this._charger();
      });
  }

  // ── Prévisualisation pièce jointe ─────────────────────────────────────────
  ouvrirPreview(msg: Message): void {
    if (!msg.pj_url) return;
    const nom = msg.pj_nom_original ?? '';
    const ext = nom.split('.').pop()?.toLowerCase();

    this.previewNom.set(nom);
    this.previewUrl.set(msg.pj_url);

    this.previewType.set(
      ext === 'pdf' ? 'pdf'
      : ['jpg', 'jpeg', 'png'].includes(ext ?? '') ? 'image'
      : null
    );
  }

  fermerPreview(): void {
    this.previewUrl.set(null);
    this.previewType.set(null);
    this.previewNom.set(null);
  }

  telechargerPj(msg: Message): void {
    if (!msg.pj_url) return;
    const a = document.createElement('a');
    a.href     = msg.pj_url;
    a.download = msg.pj_nom_original ?? 'piece-jointe';
    a.target   = '_blank';
    a.rel      = 'noopener';
    a.click();
  }

  // ── Présence ──────────────────────────────────────────────────────────────
  estEnLigne(userId: string | undefined): boolean {
    if (!userId) return false;
    return this.presence.estEnLigne(userId);
  }

  // ── Utilitaires template ──────────────────────────────────────────────────
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
      NOUVEAU:  'Nouveau',
      LU:       'Lu',
      REPONDU:  'Répondu',
      ARCHIVE:  'Archivé',
    };
    return m[statut] ?? statut;
  }

  formatTaille(octets: number | undefined): string {
    if (!octets) return '';
    return octets < 1024
      ? `${octets} o`
      : `${(octets / 1024).toFixed(1)} Ko`;
  }

  trackById(_: number, m: Message): string { return m.id; }

}
