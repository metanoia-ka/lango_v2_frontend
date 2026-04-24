import { HttpClient } from "@angular/common/http";
import { inject, Injectable, signal } from "@angular/core";
import { environnement } from "../../../../environnements/environnement";
import { catchError, Observable, tap, throwError } from "rxjs";

export interface TarifAction {
  id:          string;
  cause:       string;
  cout:        number;
  est_actif:   boolean;
  description: string;
}
 
@Injectable({ providedIn: 'root' })
export class TarifActionService {
 
  private http   = inject(HttpClient);
  private apiUrl = `${environnement.apiBaseUrl}/credits/tarifs/`;
 
  tarifs    = signal<TarifAction[]>([]);
  isLoading = signal(false);
 
  // Causes connues (miroir de CauseDebit Django)
  readonly CAUSES_DISPONIBLES = [
    { value: 'VOIR_ANNONCE',             label: 'Consultation annonce' },
    { value: 'VOIR_PARCELLE',            label: 'Consultation parcelle' },
    { value: 'ACHAT_PACK',               label: 'AchatCredit' },
    { value: 'RESERVATION_PARCELLE',     label: 'Réservation(s) parcelle(s)' },
    { value: 'VOIR_CHAINE',              label: 'Chaîne foncière' },
    { value: 'CONTACTER_VENDOR',         label: 'Contact vendeur' },
    { value: 'EXPORT_PDF',               label: 'Export PDF' },
    { value: 'BOOST_ANNONCE',            label: 'Boost annonce' },
    { value: 'ALERTE_ZONE',              label: 'Alerte zone' },
    { value: 'RAPPORT_MARCHE',           label: 'Rapport de marché' },
    { value: 'AUTRE',                    label: 'Autre' },
  ];
 
  getTarifs(): Observable<TarifAction[]> {
    this.isLoading.set(true);
    return this.http.get<TarifAction[]>(this.apiUrl, { withCredentials: true }).pipe(
      tap(data => { this.tarifs.set(data); this.isLoading.set(false); }),
      catchError(err => { this.isLoading.set(false); return throwError(() => err); })
    );
  }
 
  creer(payload: Omit<TarifAction, 'id'>): Observable<TarifAction> {
    return this.http.post<TarifAction>(
      this.apiUrl, payload, { withCredentials: true }
    ).pipe(
      tap(t => this.tarifs.update(list => [...list, t])),
      catchError(err => { this.isLoading.set(false); return throwError(() => err); })
    );
  }
 
  modifier(id: string, payload: Partial<TarifAction>): Observable<TarifAction> {
    return this.http.patch<TarifAction>(
      `${this.apiUrl}${id}/`, payload, { withCredentials: true }
    ).pipe(
      tap(t => this.tarifs.update(list => list.map(x => x.id === id ? t : x))),
      catchError(err => { this.isLoading.set(false); return throwError(() => err); })
    );
  }
 
  supprimer(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}${id}/`, { withCredentials: true }
    ).pipe(
      tap(() => this.tarifs.update(list => list.filter(x => x.id !== id)))
    );
  }
 
  toggleActif(tarif: TarifAction): Observable<TarifAction> {
    return this.modifier(tarif.id, { est_actif: !tarif.est_actif });
  }
}