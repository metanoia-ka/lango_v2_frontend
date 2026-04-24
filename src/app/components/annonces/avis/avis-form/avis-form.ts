import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AvisService } from '../../services/avis.service';
import { authInitializer } from '../../../../auth/core/auth.initializer';
import { CreateAvis } from '../../models/annonce.model';

@Component({
  selector: 'app-avis-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './avis-form.html',
  styleUrl: './avis-form.scss'
})
export class AvisForm implements OnInit{

  @Input() annonceId!: string;

  form!: FormGroup;
  submitting = false;
  error: string | null = null;
  public activeModal = inject(NgbActiveModal);
  private fb = inject(FormBuilder);
  private avisService= inject(AvisService);

  private initForm(): void {
    this.form = this.fb.group({
      note: [null, [Validators.required, Validators.min(1), Validators.max(5)]],
      titre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      commentaire: ['', Validators.maxLength(2000)],
      recommande: [true, Validators.required]
    })
  }

  ngOnInit(): void {
    this.initForm();
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.submitting = true;
    this.error = null;

    const data: CreateAvis = {
      annonce: this.annonceId,
      ...this.form.value
    };

    this.avisService.createAvis(this.annonceId, data).subscribe({
      next: () => {
        this.activeModal.close('submitted');
      },
      error: (err) => {
        this.error = err.error?.detail || "Erreur lors de l'envoi de l'avis";
        this.submitting = false;
      }
    });
  }

  cancel() {
    this.activeModal.dismiss('cancel');
  }
}
