import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environnement } from '../../../../environnements/environnement';
import {
  PlanAbonnement, AbonnementVendor, PeutPublier,
  BoostAnnonce, BoostCreate,
  AlerteRecherche, AlerteCreate,
  HistoriqueRenouvellement,
} from '../models/abonnement.model';

@Injectable({ providedIn: 'root' })
export class AbonnementService {

  private http   = inject(HttpClient);
  private apiUrl = `${environnement.apiBaseUrl}/abonnements`;

  // ── Signaux réactifs ──────────────────────────────────────────────────────
  plans         = signal<PlanAbonnement[]>([]);
  abonnement    = signal<AbonnementVendor | null>(null);
  peutPublier   = signal<PeutPublier | null>(null);
  boosts        = signal<BoostAnnonce[]>([]);
  alertes       = signal<AlerteRecherche[]>([]);
  isLoading     = signal(false);

  // ── Plans (public) ────────────────────────────────────────────────────────

  getPlans(): Observable<PlanAbonnement[]> {
    return this.http.get<PlanAbonnement[]>(
      `${this.apiUrl}/plans/`, { withCredentials: true }
    ).pipe(
      tap(data => this.plans.set(data)),
      catchError(err => throwError(() => err))
    );
  }

  createPlan(payload: Partial<PlanAbonnement>): Observable<PlanAbonnement> {
    return this.http.post<PlanAbonnement>(
      `${this.apiUrl}/plans/`, payload, { withCredentials: true }
    ).pipe(
      tap(plan => this.plans.update(
        list => [...list, plan].sort((a, b) => a.ordre - b.ordre))),
        catchError(err => throwError(() => err))
      );
  }
 
  updatePlan(id: string, payload: Partial<PlanAbonnement>): Observable<PlanAbonnement> {
    return this.http.patch<PlanAbonnement>(
      `${this.apiUrl}/plans/${id}/`, payload, { withCredentials: true }
    ).pipe(tap(plan => this.plans.update(list =>
      list.map(p => p.id === plan.id ? plan : p)
    )));
  }
 
  deletePlan(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/plans/${id}/`, { withCredentials: true }
    ).pipe(tap(() => this.plans.update(list =>
      list.filter(p => p.id !== id)
    )));
  }

  getHistorique(): Observable<HistoriqueRenouvellement[]> {
    return this.http.get<HistoriqueRenouvellement[]>(
      `${this.apiUrl}/historique/`, { withCredentials: true }
    );
  }

  // ── Mon abonnement ────────────────────────────────────────────────────────

  getMonAbonnement(): Observable<AbonnementVendor> {
    this.isLoading.set(true);
    return this.http.get<AbonnementVendor>(
      `${this.apiUrl}/mon-abonnement/`, { withCredentials: true }
    ).pipe(
      tap(data => {
        this.abonnement.set(data);
        this.isLoading.set(false);
      }),
      catchError(err => {
        this.isLoading.set(false);
        this.abonnement.set(null);
        // 404 = aucun abonnement actif — pas une erreur critique
        if (err.status === 404) return of(null as any);
        return throwError(() => err);
      })
    );
  }

  checkPeutPublier(): Observable<PeutPublier> {
    return this.http.get<PeutPublier>(
      `${this.apiUrl}/peut-publier/`, { withCredentials: true }
    ).pipe(
      tap(data => this.peutPublier.set(data)),
      catchError(err => throwError(() => err))
    );
  }

  // ── Actions abonnement ────────────────────────────────────────────────────

  souscrire(planId: string): Observable<AbonnementVendor> {
    return this.http.post<AbonnementVendor>(
      `${this.apiUrl}/souscrire/`,
      { plan_id: planId },
      { withCredentials: true }
    ).pipe(
      tap(data => this.abonnement.set(data)),
      catchError(err => throwError(() => err))
    );
  }

  resilier(): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(
      `${this.apiUrl}/resilier/`, {}, { withCredentials: true }
    ).pipe(
      tap(() => this.abonnement.set(null)),
      catchError(err => throwError(() => err))
    );
  }

  changerPlan(planId: string): Observable<AbonnementVendor> {
    return this.http.post<AbonnementVendor>(
      `${this.apiUrl}/changer-plan/`,
      { plan_id: planId },
      { withCredentials: true }
    ).pipe(
      tap(data => this.abonnement.set(data)),
      catchError(err => throwError(() => err))
    );
  }

  renouvelerAdmin(id: string, reference?: string): Observable<AbonnementVendor> {
    return this.http.post<AbonnementVendor>(
      `${this.apiUrl}/${id}/renouveler/`,
      { reference_paiement: reference ?? '' },
      { withCredentials: true }
    );
  }

  // ── Boosts ────────────────────────────────────────────────────────────────

  getBoosts(): Observable<BoostAnnonce[]> {
    return this.http.get<BoostAnnonce[]>(
      `${this.apiUrl}/boosts/`, { withCredentials: true }
    ).pipe(
      tap(data => this.boosts.set(data)),
      catchError(err => throwError(() => err))
    );
  }

  creerBoost(payload: BoostCreate): Observable<BoostAnnonce> {
    return this.http.post<BoostAnnonce>(
      `${this.apiUrl}/boosts/`, payload, { withCredentials: true }
    ).pipe(
      tap(boost => this.boosts.update(list => [boost, ...list]))
    );
  }

  // ── Alertes recherche ─────────────────────────────────────────────────────

  getAlertes(): Observable<AlerteRecherche[]> {
    return this.http.get<AlerteRecherche[]>(
      `${this.apiUrl}/alertes/`, { withCredentials: true }
    ).pipe(tap(data => this.alertes.set(data)));
  }

  creerAlerte(payload: AlerteCreate): Observable<AlerteRecherche> {
    return this.http.post<AlerteRecherche>(
      `${this.apiUrl}/alertes/`, payload, { withCredentials: true }
    ).pipe(
      tap(alerte => this.alertes.update(list => [alerte, ...list]))
    );
  }

  supprimerAlerte(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/alertes/${id}/`, { withCredentials: true }
    ).pipe(
      tap(() => this.alertes.update(list => list.filter(a => a.id !== id)))
    );
  }

  // ── Helpers UI ────────────────────────────────────────────────────────────

  getNiveauColor(niveau: string): string {
    const colors: Record<string, string> = {
      ESSENTIEL:     '#0F6E56',
      PROFESSIONNEL: '#3C3489',
      AGENCE:        '#993C1D',
    };
    return colors[niveau] ?? '#374151';
  }

  getNiveauBg(niveau: string): string {
    const bgs: Record<string, string> = {
      ESSENTIEL:     '#e1f5ee',
      PROFESSIONNEL: '#eeedfe',
      AGENCE:        '#faece7',
    };
    return bgs[niveau] ?? '#f3f4f6';
  }

  getStatutClass(statut: string): string {
    const classes: Record<string, string> = {
      ACTIF:    'abo-badge--actif',
      EXPIRE:   'abo-badge--expire',
      RESILIE:  'abo-badge--resilie',
      SUSPENDU: 'abo-badge--suspendu',
    };
    return classes[statut] ?? '';
  }
}
