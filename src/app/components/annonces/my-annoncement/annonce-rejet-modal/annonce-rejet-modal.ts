import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationService } from '../../../confirmation-modal/service/confirmation';
import { AnnonceService } from '../../services/annonce.service';
import { Annonce } from '../../models/annonce.model';
import { Alert } from '../../../alerts/alert/alert';

@Component({
  selector: 'app-annonce-rejet-modal',
  imports: [CommonModule, ReactiveFormsModule, Alert],
  templateUrl: './annonce-rejet-modal.html',
  styleUrl: './annonce-rejet-modal.scss',
  providers: [DatePipe]
})
export class AnnonceRejetModal implements OnInit {

  @Input() annonceId!: string;
  @Input() annonce!: Annonce;

  public activeModal = inject(NgbActiveModal);
  private fb = inject(FormBuilder);
  private modal = inject(NgbModal);
  private datePipe = inject(DatePipe);
  
  private confirmation = inject(ConfirmationService);

  rejectForm!: FormGroup;

  responseType: 'success' | 'danger' = 'success';
  successMessage: string = '';
  errorMessage: string = '';
  isSubmitting = false;
  isLoading = false;

  ngOnInit(): void {
    this.initFormRejectAnnonce();
  }

  private initFormRejectAnnonce(): void {
    this.rejectForm = this.fb.group({
      motif_rejet: ['', [Validators.required, Validators.minLength(12)]]
    });
  }

  async onReject() {

    const formattedDate = this.datePipe.transform(this.annonce.created_at, 'dd/MM/yyyy');

    const confirmed = await this.confirmation.confirm({
      title: 'Reject de l\'annonce',
      message: 'Êtes-vous sûr de vouloir rejeter cette annonce ?',
      type: 'bg-warning',
      icon: 'bi-check-circle',
      iconMessageSmall: '🛑',
      iconMessageBig: '🚫',
      confirmLabel: 'Oui',
      cancelLabel: 'Non',
      zonePhraseOne: `Date of submission: ${this.annonce.date_validation}`,
      zonePhraseTwo: `Owner of annonce: ${this.annonce.auteur_nom}`,
      zonePhraseThree: `Date of creation: ${formattedDate}`
    });  

    if (!confirmed) return;

    try {
      this.onSubmitForm();
    } finally {
      setTimeout(() => {
        this.modal.dismissAll();
      }, 3000);
    }
  }

  onSubmitForm() {

    this.rejectForm.markAllAsTouched();

    if (this.rejectForm.invalid) return;

    if(this.rejectForm.valid) {
      const rejet = this.rejectForm.value.motif_rejet;
      this.activeModal.close(rejet);
    }
  }

  clearSuccessMessage() {
    this.successMessage = '';
  }

  clearErrorMessage() {
    this.errorMessage = '';
  }
  
}
