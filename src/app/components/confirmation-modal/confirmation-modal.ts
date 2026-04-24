import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { NgbActiveModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule, NgbTooltipModule],
  templateUrl: './confirmation-modal.html',
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' })),
      ]),
    ]),
  ],
  styleUrl: './confirmation-modal.scss',
})
export class ConfirmationModal implements OnInit {
  
  ngOnInit(): void {
    this.isLoading = true;
  }
  
  // Titre et message de la modale, passés depuis le composant parent
  @Input() title!: string;
  @Input() message!: string;
  @Input() type: string = 'bg-danger';
  @Input() cancelLabel: string = 'Annuler';
  @Input() confirmLabel: string = 'Confirmer';
  @Input() icon: string = 'bi-trash';
  @Input() zonePhraseOne: string = '';
  @Input() zonePhraseTwo: string = '';
  @Input() zonePhraseThree: string = '';
  @Input() iconMessageSmall: string = '';
  @Input() iconMessageBig: string = '';
  @Input() requireMotif   = false;
  @Input() motifLabel     = 'Motif de suppression';
  @Input() motifMinLength = 10;

  @Input() infoMode  = false;
  @Input() context: 'create' | 'update' | 'delete' | 'submit' | 'info' = 'info';
  @Input() detail    = '';
  @Input() closeLabel = 'Compris';

  // Référence à la modale active pour la fermer
  activeModal = inject(NgbActiveModal);
  isLoading = false;

  motif     = signal('');
  motifError = signal('');

  get canConfirm(): boolean {
    if (!this.requireMotif) return true;
    return this.motif().trim().length >= this.motifMinLength;
  }

  confirm(): void {
    if (this.requireMotif) {
      const val = this.motif().trim();
      if (val.length < this.motifMinLength) {
        this.motifError.set(
          `Le motif doit contenir au moins ${this.motifMinLength} caractères.`
        );
        return;
      }
      this.activeModal.close(val);   // ← retourne le motif
    } else {
      this.activeModal.close(true);
    }
  }

  /**
   * Ferme la modale avec le résultat 'confirm'.
   */
  onConfirm(): void {
    this.confirm();
    //this.activeModal.close('confirm');
  }

  /**
   * Ferme la modale avec le résultat 'cancel'.
   */
  onCancel(): void {
    this.activeModal.dismiss('cancel');
  }

  // Icône par contexte (peut être surchargée par l'appelant)
  get contextIcon(): string {
    const map: Record<string, string> = {
      create: 'bi-plus-circle-fill',
      update: 'bi-pencil-check',
      delete: 'bi-trash-fill',
      submit: 'bi-send-check-fill',
      info:   'bi-info-circle-fill',
    };
    return this.icon || map[this.context] || 'bi-info-circle-fill';
  }

  get contextType(): string {
    const map: Record<string, string> = {
      create: 'bg-success',
      update: 'bg-primary',
      delete: 'bg-danger',
      submit: 'bg-success',
      info:   'bg-info',
    };
    return this.type || map[this.context] || 'bg-info';
  }

  onClose(): void {
    this.activeModal.close('closed');
  }

  getVariant(): string {
    const map: Record<string, string> = {
      'bg-danger':  'danger',
      'bg-warning': 'warning',
      'bg-success': 'success',
      'bg-info':    'info'
    };
    return map[this.type] ?? 'danger';
  }
}
