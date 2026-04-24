import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { PremiumService } from '../../services/premium';

@Component({
  selector: 'app-mes-dossiers',
  imports: [CommonModule],
  templateUrl: './mes-dossiers.html',
  styleUrl: './mes-dossiers.scss'
})
export class MesDossiers implements OnInit {

  private premSvc = inject(PremiumService);

  dossiers  = this.premSvc.dossiers;
  isLoading = this.premSvc.isLoading;
 
  ngOnInit(): void {
    this.premSvc.getDossiers().subscribe();
  }
 
  telechargerPdf(url: string): void {
    window.open(url, '_blank');
  }

}
