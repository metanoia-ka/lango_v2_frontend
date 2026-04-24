import { inject, Injectable, signal } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { catchError, Observable, tap, throwError } from "rxjs";
import { 
  AchatCredit, CauseDebit, CreditTransaction, 
  DebitResult, InitAchatPayload, ManuelRefundRequest, MouvementCredit, PackCredit, 
  SoldeCheck, TarifAction, TransactionFilters
} from "../models/credit.model";
import { environnement } from "../../../../environnements/environnement";

@Injectable({ providedIn: 'root' })
export class CreditService {

  private base = `${environnement.apiBaseUrl}/credits`;
  private http  = inject(HttpClient);

  // ── Signaux réactifs ──────────────────────────────────────────────────────
  solde        = signal<number>(0);
  packs        = signal<PackCredit[]>([]);
  transactions = signal<CreditTransaction[]>([]);
  achats       = signal<AchatCredit[]>([]);
  tarifs       = signal<TarifAction[]>([]);
  mouvements   = signal<MouvementCredit[]>([]);
  isLoading    = signal(false);

  // ── Packs (public) ────────────────────────────────────────────────────────

  getPacks(): Observable<PackCredit[]> {
    return this.http.get<PackCredit[]>(
      `${this.base}/packs/`, { withCredentials: true }
    ).pipe(
      tap(data => { 
        this.packs.set(data); 
      }),
      catchError(
        (err )=> { 
          return throwError(() => err); 
        }
      )
    );
  }

  createPack(payload: Partial<PackCredit>): Observable<PackCredit> {
    return this.http.post<PackCredit>(
      `${this.base}/packs/`, payload, { withCredentials: true }
    );
  }

  updatePack(id: string, payload: Partial<PackCredit>): Observable<PackCredit> {
    return this.http.patch<PackCredit>(
      `${this.base}/packs/${id}/`, payload, { withCredentials: true }
    );
  }

  deletePack(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/packs/${id}/`, { withCredentials: true }
    );
  }

  // ── Mouvements ─────────────────────────────────────────────────────────────────

  getHistoriqueMouvements(
    filters?: { user?: string, type?: string }
  ): Observable<MouvementCredit[]> {
    this.isLoading.set(true);
    let params = new HttpParams();
    
    if (filters?.user) {
        params = params.set('user', filters.user);
    }
    if (filters?.type) {
        params = params.set('type_mouvement', filters.type);
    }

    return this.http.get<MouvementCredit[]>(
      `${this.base}/mouvements/`, { params,  withCredentials: true }
    ).pipe(
      tap(data => { 
        console.log(`La base est: ${this.base}`);
        this.mouvements.set(data); 
        this.isLoading.set(false); 
      }),
      catchError(err => { this.isLoading.set(false); return throwError(() => err); })
    );
  }

  rembourserManuellement(payload: ManuelRefundRequest): Observable<ManuelRefundRequest> {
    return this.http.post<ManuelRefundRequest>(
      `${this.base}/mouvements/rembourser-manuel/`, payload, { withCredentials: true }
    ).pipe(
      //tap(t => this.mouvements.update(list => list.map(x => x.id === id ? t : x))),
      catchError(err => { this.isLoading.set(false); return throwError(() => err); })
    );
  }

  // ── Solde ─────────────────────────────────────────────────────────────────

  getSolde(action?: CauseDebit): Observable<SoldeCheck> {
    let params = new HttpParams();
    if (action) params = params.set('action', action);
    return this.http.get<SoldeCheck>(
      `${this.base}/solde/`, { params, withCredentials: true }
    ).pipe(tap(data => this.solde.set(data.solde)));
  }

  rafraichirSolde(): void {
    this.getSolde().subscribe();
  }

  // ── Transactions ──────────────────────────────────────────────────────────

  getTransactions(filters?: TransactionFilters): Observable<CreditTransaction[]> {
    let params = new HttpParams();
    if (filters?.type)  params = params.set('type',  filters.type);
    if (filters?.cause) params = params.set('cause', filters.cause);

    return this.http.get<CreditTransaction[]>(
      `${this.base}/transactions/`, { params, withCredentials: true }
    ).pipe(
      tap(data => { 
        this.transactions.set(data); 
      }),
      catchError(err => {
        return throwError(() => err); 
      })
    );
  }

  // ── Achats ────────────────────────────────────────────────────────────────

  initierAchat(payload: InitAchatPayload): Observable<AchatCredit> {
    return this.http.post<AchatCredit>(
      `${this.base}/acheter/`, payload, { withCredentials: true }
    );
  }

  getMesAchats(): Observable<AchatCredit[]> {
    return this.http.get<AchatCredit[]>(
      `${this.base}/acheter/`, { withCredentials: true }
    ).pipe(
      tap(data => { 
        this.achats.set(data);
      }),
      catchError(err => {
        return throwError(() => err); 
      })
    );
  }

  getAchatDetail(id: string): Observable<AchatCredit> {
    return this.http.get<AchatCredit>(
      `${this.base}/acheter/${id}/`, { withCredentials: true }
    );
  }

  confirmerAchat(id: string, reference_paiement = ''): Observable<AchatCredit> {
    return this.http.post<AchatCredit>(
      `${this.base}/acheter/${id}/confirmer/`,
      { reference_paiement },
      { withCredentials: true }
    );
  }

  // ── Tarifs ────────────────────────────────────────────────────────────────

  getTarifs(): Observable<TarifAction[]> {
    return this.http.get<TarifAction[]>(
      `${this.base}/tarifs/`, { withCredentials: true }
    ).pipe(tap(data => this.tarifs.set(data)));
  }

  // ── Débit direct ──────────────────────────────────────────────────────────

  debiter(
    cause: CauseDebit,
    reference_id: string,
    reference_type: string
  ): Observable<DebitResult> {
    return this.http.post<DebitResult>(
      `${this.base}/debiter/`,
      { cause, reference_id, reference_type },
      { withCredentials: true }
    ).pipe(
      tap(res => this.solde.set(res.solde))
    );
  }

  // ── Helpers UI ────────────────────────────────────────────────────────────

  getStatutClass(statut: string): string {
    const map: Record<string, string> = {
      PENDING:   'bg-warning text-dark',
      CONFIRME:  'bg-success',
      ECHEC:     'bg-danger',
      REMBOURSE: 'bg-secondary',
    };
    return map[statut] ?? 'bg-secondary';
  }

  getTypeClass(type: string): string {
    return type === 'CREDIT' ? 'tx-credit' : 'tx-debit';
  }

  getTypeSign(type: string): string {
    return type === 'CREDIT' ? '+' : '−';
  }

  getCauseLabel(cause: string): string {
    const map: Record<string, string> = {
      ACHAT_PACK:       'AchatCredit',
      VOIR_PARCELLE:    'Consultation parcelle',
      VOIR_CHAINE:      'Chaîne foncière',
      CONTACTER_VENDOR: 'Contact vendeur',
      EXPORT_PDF:       'Export PDF',
      BOOST_ANNONCE:    'Boost annonce',
      ALERTE_ZONE:      'Alerte zone',
      RAPPORT_MARCHE:   'Rapport de marché',
      REMBOURSEMENT:    'Remboursement',
      AUTRE:            'Autre',
      RESERVATION_PARCELLE: 'Réservation(s) parcelle(s)',
    };
    return map[cause] ?? cause;
  }

  getMethodeLabel(methode: string): string {
    const map: Record<string, string> = {
      MTN_MOMO: 'MTN Mobile Money',
      ORANGE:   'Orange Money',
      STRIPE:   'Carte bancaire',
      MANUEL:   'Validation admin',
    };
    return map[methode] ?? methode;
  }

}