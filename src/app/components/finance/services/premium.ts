import { HttpClient } from "@angular/common/http";
import { inject, Injectable, signal } from "@angular/core";
import { environnement } from "../../../../environnements/environnement";
import { 
  AlerteCreate,
  AlerteDisponibilite, 
  ComparaisonCreate, 
  ComparaisonParcelles, 
  ConsultationResponse, 
  DemandeContact, 
  DemandeContactCreate, 
  DossierFoncier, 
  ReservationCreate, 
  ReservationParcelle 
} from "../models/premium.model";
import { catchError, Observable, tap, throwError } from "rxjs";

@Injectable({ providedIn: 'root' })
export class PremiumService {
 
  private http   = inject(HttpClient);
  private base   = `${environnement.apiBaseUrl}/premium`;
 
  // ── Signaux réactifs ──────────────────────────────────────────────────────
  reservations  = signal<ReservationParcelle[]>([]);
  comparaisons  = signal<ComparaisonParcelles[]>([]);
  dossiers      = signal<DossierFoncier[]>([]);
  contacts      = signal<DemandeContact[]>([]);
  alertes       = signal<AlerteDisponibilite[]>([]);
  isLoading     = signal(false);
 
  // ── Consultations parcelle ────────────────────────────────────────────────
 
  /**
   * POST /premium/consultations/fiche/
   * Débit 5 cr. — accède à la fiche complète de la parcelle.
   */
  accederFiche(parcelleId: string): Observable<ConsultationResponse> {
    return this.http.post<ConsultationResponse>(
      `${this.base}/consultations/fiche/`,
      { parcelle_id: parcelleId },
      { withCredentials: true }
    );
  }
 
  /**
   * POST /premium/consultations/chaine/
   * Débit 8 cr. — accède à la chaîne foncière complète.
   */
  accederChaine(parcelleId: string): Observable<ConsultationResponse> {
    return this.http.post<ConsultationResponse>(
      `${this.base}/consultations/chaine/`,
      { parcelle_id: parcelleId },
      { withCredentials: true }
    );
  }
 
  // ── Réservations ──────────────────────────────────────────────────────────
 
  getReservations(): Observable<ReservationParcelle[]> {
    this.isLoading.set(true);
    return this.http.get<ReservationParcelle[]>(
      `${this.base}/reservations/`, { withCredentials: true }
    ).pipe(
      tap(data => { this.reservations.set(data); this.isLoading.set(false); }),
      catchError(err => { this.isLoading.set(false); return throwError(() => err); })
    );
  }
 
  /**
   * POST /premium/reservations/reserver/
   * Débit 25 cr.
   */
  reserver(payload: ReservationCreate): Observable<ReservationParcelle> {
    return this.http.post<ReservationParcelle>(
      `${this.base}/reservations/reserver/`,
      payload,
      { withCredentials: true }
    ).pipe(
      tap(r => this.reservations.update(list => [r, ...list]))
    );
  }
 
  /**
   * POST /premium/reservations/{id}/annuler/
   */
  annulerReservation(id: string): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(
      `${this.base}/reservations/${id}/annuler/`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(() => this.reservations.update(list =>
        list.map(r => r.id === id ? { ...r, statut: 'ANNULEE' as const } : r)
      ))
    );
  }
 
  // ── Comparaisons ──────────────────────────────────────────────────────────
 
  getComparaisons(): Observable<ComparaisonParcelles[]> {
    return this.http.get<ComparaisonParcelles[]>(
      `${this.base}/comparaisons/`, { withCredentials: true }
    ).pipe(tap(data => this.comparaisons.set(data)));
  }
 
  /**
   * POST /premium/comparaisons/
   * Débit 5 cr. — compare 2 à 3 parcelles.
   */
  comparer(payload: ComparaisonCreate): Observable<ComparaisonParcelles> {
    return this.http.post<ComparaisonParcelles>(
      `${this.base}/comparaisons/`,
      payload,
      { withCredentials: true }
    ).pipe(
      tap(c => this.comparaisons.update(list => [c, ...list]))
    );
  }
 
  // ── Dossiers fonciers ─────────────────────────────────────────────────────
 
  getDossiers(): Observable<DossierFoncier[]> {
    this.isLoading.set(true);
    return this.http.get<DossierFoncier[]>(
      `${this.base}/dossiers/`, { withCredentials: true }
    ).pipe(
      tap(data => { this.dossiers.set(data); this.isLoading.set(false); }),
      catchError(err => { this.isLoading.set(false); return throwError(() => err); })
    );
  }
 
  getDossier(id: string): Observable<DossierFoncier> {
    return this.http.get<DossierFoncier>(
      `${this.base}/dossiers/${id}/`, { withCredentials: true }
    );
  }
 
  /**
   * POST /premium/dossiers/commander/
   * Débit 20 cr. — génère le dossier foncier complet.
   */
  commanderDossier(parcelleId: string): Observable<DossierFoncier> {
    return this.http.post<DossierFoncier>(
      `${this.base}/dossiers/commander/`,
      { parcelle_id: parcelleId },
      { withCredentials: true }
    ).pipe(
      tap(d => this.dossiers.update(list => [d, ...list]))
    );
  }
 
  // ── Demandes de contact ───────────────────────────────────────────────────
 
  getContacts(): Observable<DemandeContact[]> {
    this.isLoading.set(true);
    return this.http.get<DemandeContact[]>(
      `${this.base}/contacts/`, { withCredentials: true }
    ).pipe(
      tap(data => { this.contacts.set(data); this.isLoading.set(false); }),
      catchError(err => { this.isLoading.set(false); return throwError(() => err); })
    );
  }
 
  /**
   * POST /premium/contacts/envoyer/
   * Débit 15 cr. — mise en relation avec le propriétaire.
   */
  envoyerContact(payload: DemandeContactCreate): Observable<DemandeContact> {
    return this.http.post<DemandeContact>(
      `${this.base}/contacts/envoyer/`,
      payload,
      { withCredentials: true }
    ).pipe(
      tap(c => this.contacts.update(list => [c, ...list]))
    );
  }
 
  /**
   * POST /premium/contacts/{id}/traiter/  — Admin/Manager
   */
  traiterContact(
    id: string,
    decision: 'TRANSMISE' | 'REFUSEE',
    note: string = ''
  ): Observable<DemandeContact> {
    return this.http.post<DemandeContact>(
      `${this.base}/contacts/${id}/traiter/`,
      { decision, note },
      { withCredentials: true }
    ).pipe(
      tap(c => this.contacts.update(list =>
        list.map(x => x.id === id ? c : x)
      ))
    );
  }
 
  // ── Alertes disponibilité ─────────────────────────────────────────────────
 
  getAlertes(): Observable<AlerteDisponibilite[]> {
    return this.http.get<AlerteDisponibilite[]>(
      `${this.base}/alertes/`, { withCredentials: true }
    ).pipe(tap(data => this.alertes.set(data)));
  }
 
  /**
   * POST /premium/alertes/activer/
   * Débit 3 cr. activation.
   */
  activerAlerte(payload: AlerteCreate): Observable<AlerteDisponibilite> {
    return this.http.post<AlerteDisponibilite>(
      `${this.base}/alertes/activer/`,
      payload,
      { withCredentials: true }
    ).pipe(
      tap(a => this.alertes.update(list => [a, ...list]))
    );
  }
 
  /**
   * POST /premium/alertes/{id}/desactiver/
   */
  desactiverAlerte(id: string): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(
      `${this.base}/alertes/${id}/desactiver/`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(() => this.alertes.update(list =>
        list.map(a => a.id === id ? { ...a, statut: 'PAUSEE' as const } : a)
      ))
    );
  }
 
  /**
   * DELETE /premium/alertes/{id}/
   */
  supprimerAlerte(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/alertes/${id}/`, { withCredentials: true }
    ).pipe(
      tap(() => this.alertes.update(list => list.filter(a => a.id !== id)))
    );
  }
 
  // ── Visites lotissement ───────────────────────────────────────────────────
 
  /**
   * POST /premium/visites/enregistrer/
   * Gratuit — sert aux stats.
   */
  enregistrerVisite(lotissementId: string): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(
      `${this.base}/visites/enregistrer/`,
      { lotissement_id: lotissementId },
      { withCredentials: true }
    );
  }
 
  // ── Helpers UI ────────────────────────────────────────────────────────────
 
  getStatutReservationClass(statut: string): string {
    const map: Record<string, string> = {
      ACTIVE:    'prem-badge--active',
      EXPIREE:   'prem-badge--expire',
      ANNULEE:   'prem-badge--annule',
      CONVERTIE: 'prem-badge--convertie',
    };
    return map[statut] ?? '';
  }
 
  getStatutDemandeClass(statut: string): string {
    const map: Record<string, string> = {
      EN_ATTENTE: 'prem-badge--attente',
      TRANSMISE:  'prem-badge--transmise',
      ACCEPTEE:   'prem-badge--active',
      REFUSEE:    'prem-badge--annule',
      EXPIREE:    'prem-badge--expire',
    };
    return map[statut] ?? '';
  }
 
  getStatutAlerteClass(statut: string): string {
    const map: Record<string, string> = {
      ACTIVE:      'prem-badge--active',
      PAUSEE:      'prem-badge--attente',
      EXPIREE:     'prem-badge--expire',
      DECLENCHEE:  'prem-badge--convertie',
    };
    return map[statut] ?? '';
  }
 
  getTypeCibleIcon(type: string): string {
    const map: Record<string, string> = {
      PARCELLE:    'bi-geo-alt-fill',
      ZONE:        'bi-map-fill',
      LOTISSEMENT: 'bi-grid-3x3-gap-fill',
    };
    return map[type] ?? 'bi-bell';
  }
}