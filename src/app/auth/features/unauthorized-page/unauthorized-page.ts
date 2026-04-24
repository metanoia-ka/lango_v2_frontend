import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Authentication } from '../../core/authentication';
import { CommonModule, Location } from '@angular/common';

@Component({
  selector: 'app-unauthorized-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './unauthorized-page.html',
  styleUrl: './unauthorized-page.scss'
})
export class UnauthorizedPage implements OnInit {

  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private auth   = inject(Authentication);
 
  user        = this.auth.currentUserSignal;
  returnUrl   = signal<string>('/lango/annonces');   // fallback par défaut
  compteur    = signal(15);                           // compte à rebours
  private _timer: ReturnType<typeof setInterval> | null = null;
 
  ngOnInit(): void {
    // Récupérer l'URL de retour depuis les queryParams
    // Ex: /unauthorized?returnUrl=/lango/annonces/id/detail
    const fromQuery = this.route.snapshot.queryParamMap.get('returnUrl');
    // Ou depuis l'historique du navigateur (état de navigation)
    const fromState = (history.state as any)?.returnUrl;
 
    const cible = fromQuery || fromState || '/lango/annonces';
    this.returnUrl.set(cible);
 
    // Compte à rebours → redirection automatique après Xs
    this._timer = setInterval(() => {
      this.compteur.update(c => c - 1);
      if (this.compteur() <= 0) this.retourner();
    }, 1000);
  }
 
  ngOnDestroy(): void {
    if (this._timer) clearInterval(this._timer);
  }
 
  retourner(): void {
    if (this._timer) clearInterval(this._timer);
    this.router.navigateByUrl(this.returnUrl());
  }
 
  allerConnexion(): void {
    if (this._timer) clearInterval(this._timer);
    this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl: this.returnUrl() }
    });
  }

}
