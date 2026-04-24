import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Authentication } from '../../auth/core/authentication';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class HomeComponent  {

  private router = inject(Router);
  private auth = inject(Authentication);

  user = this.auth.currentUserValue;

  onLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
