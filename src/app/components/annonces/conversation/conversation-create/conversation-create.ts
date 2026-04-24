import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ConversationService } from '../../services/conversation.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Alert } from '../../../alerts/alert/alert';

@Component({
  selector: 'app-conversation-create',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, Alert],
  templateUrl: './conversation-create.html',
  styleUrl: './conversation-create.scss'
})
export class ConversationCreate implements OnInit{

  @Input() annonceId: string | null = null;

  conversationForm!: FormGroup;
  
  private conversationService = inject(ConversationService);
  
  private activeModal = inject(NgbActiveModal);
  private fb = inject(FormBuilder);

  isLoading = signal(false);
  errorMessage: string | null = null;
  responseType: 'success' | 'danger' = 'success';
  successMessage: string = '';
  isSubmitting = false;

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.conversationForm = this.fb.group({
      message_initial: ['', Validators.required]
    });
  }

  clearSuccessMessage() {
    this.successMessage = '';
  }

  clearErrorMessage() {
    this.errorMessage = '';
  }

  onCancel(): void {
    this.activeModal.dismiss();
  }

  onSubmit(): void {

    if (this.conversationForm.invalid) return;

    this.isLoading.set(true);

    const data = {
      annonce_id: this.annonceId!,
      message_initial: this.conversationForm.get('message_initial')?.value
    };

    this.conversationService.createConversation(data).subscribe({
      next: () => {
        this.successMessage = 'Merci pour votre message !';
        this.responseType = 'success';
        this.isLoading.set(false);

        this.conversationForm.reset();

        setTimeout(() => {
          this.activeModal.close('saved');
        }, 3000);
      },
      error: (err) => {
        this.errorMessage = err.detail || err.message;
        this.responseType = 'danger';
        this.isLoading.set(false);
      }
    })

  }
}
