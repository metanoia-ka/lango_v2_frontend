import { HttpClient } from "@angular/common/http";
import { inject, Injectable, signal } from "@angular/core";
import { environnement } from "../../../../environnements/environnement";
import { catchError, Observable, tap, throwError } from "rxjs";
import { 
  Offre,
  OffreContreProposition,
  OffreCreate,
  Reservation, 
  ReservationCreate, 
  ReservationResponse, 
  ReservationStatut 
} from "../models/reservation-parcelle.model";

export interface ReservationParcelle {
  id:               string;
  parcelle:         string;
  parcelle_numero:  string;
  parcelle_nom:     string;
  lotissement_nom:  string;
  client:           string;
  client_nom:       string;
  statut:           string;
  credits_debites:  number;
  credits_rembourses: number;
  message_initial:  string;
  heures_restantes: number;
  created_at:       string;
  expire_le:        string;
  offres:           OffreNegociation[];
}

export interface OffreNegociation {
  id:              string;
  reservation:     string;
  vendeur:         string;
  vendeur_nom:     string;
  prix_vendeur:    string;
  prix_client:     string | null;
  prix_final:      string | null;
  type_prix:       'PAR_M2' | 'TOTAL';
  statut:          string;
  message_vendeur: string;
  message_client:  string;
  tour:            number;
  created_at:      string;
  expire_le:       string;
}

@Injectable({ providedIn: 'root' })
export class ReservationService {
  private http   = inject(HttpClient);
  private apiUrl = `${environnement.apiBaseUrl}`;
  private offreUrl = `${environnement.apiBaseUrl}/offres`;

  mesReservations = signal<Reservation[]>([]);
  loading         = signal(false);

  // ── Client ───────────────────────────────────────────────────────────────

  creerReservation(
    payload: ReservationCreate
  ): Observable<ReservationResponse> {
    return this.http.post<ReservationResponse>(
      `${this.apiUrl}/reservations-parcelles/`,
      payload,
      { withCredentials: true }
    ).pipe(
      tap(r => {
        this.mesReservations.update(list => [...r.reservations, ...list]);
      }),
      catchError(err => {
        return throwError(() => err);
      })
    );
  }

  getMesReservations(): Observable<Reservation[]> {
    this.loading.set(true);
    return this.http.get<Reservation[]>(
      `${this.apiUrl}/reservations-parcelles/`,
      { withCredentials: true }
    ).pipe(
      tap(data => {
        this.mesReservations.set(data);
        this.loading.set(false);
      })
    );
  }

  annulerReservation(id: string): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/reservations-parcelles/${id}/`,
      { withCredentials: true }
    ).pipe(
      tap(() => {
        this.mesReservations.update(list =>
          list.map(r => r.id === id ? { ...r, statut: 'ANNULEE' as ReservationStatut } : r)
        );
      })
    );
  }

  faireOffre(payload: OffreCreate): Observable<Offre> {
    return this.http.post<Offre>(
      `${this.offreUrl}/`,
      payload,
      { withCredentials: true }
    );
  }

  // Vendor → contre-proposition
  contreProposer(offreId: string, payload: OffreContreProposition): Observable<Offre> {
    return this.http.post<Offre>(
      `${this.offreUrl}/${offreId}/contre-proposer/`,
      { prix_client: payload.prix_contre_propose, message: '' },
      { withCredentials: true }
    );
  }

  // ── Actions CLIENT ─────────────────────────────────────────────────────────

  // Client accepte l'offre du vendeur (EN_ATTENTE → ACCEPTEE_CLIENT)
  accepterOffreVendeur(offreId: string, message = ''): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/offres/${offreId}/accepter/`,
      { message },
      { withCredentials: true }
    );
  }
 
  // Purchaser → accepter la contre-proposition du vendor
  accepterContreProposition(offreId: string, message = ''): Observable<Offre> {
    return this.http.post<Offre>(
      `${this.offreUrl}/${offreId}/accepter/`,
      { message },
      { withCredentials: true }
    );
  }
 
  // Purchaser → refuser la contre-proposition
  refuserContreProposition(offreId: string): Observable<Offre> {
    return this.http.post<Offre>(
      `${this.offreUrl}/${offreId}/refuser/`,
      {},
      { withCredentials: true }
    );
  }

  // Vendor → accepter l'offre d'un client parmi les 3 possibles
  // → attribution automatique, restitution 35% aux autres
  accepterOffre(offreId: string): Observable<any> {
    return this.http.post(
      `${this.offreUrl}/${offreId}/accepter_definitif/`,
      {},
      { withCredentials: true }
    );
  }
 
  // Lister les offres (vendor : toutes ses offres ; purchaser : ses offres)
  getOffres(reservationId?: string): Observable<Offre[]> {
    let url = `${this.offreUrl}/`;
    if (reservationId) url += `?reservation=${reservationId}`;
    return this.http.get<Offre[]>(url, { withCredentials: true });
  }

  // ── Vendeur ──────────────────────────────────────────────────────────────

  getMesParcelles(statut?: string): Observable<ReservationParcelle[]> {
    const params = statut ? `?statut=${statut}` : '';
    return this.http.get<ReservationParcelle[]>(
      `${this.apiUrl}/reservations-parcelles/mes-parcelles/${params}`,
      { withCredentials: true }
    );
  }

  creerOffre(
		reservationId: string, prixVendeur: number, typePrix = 'PAR_M2', message = ''
	): Observable<OffreNegociation> {
    return this.http.post<OffreNegociation>(
      `${this.apiUrl}/offres/`,
      {
        reservation_id: reservationId,
        prix_vendeur:   prixVendeur,
        type_prix:      typePrix,
        message_vendeur: message,
      },
      { withCredentials: true }
    );
  }

  vendeurAccepter(offreId: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/offres/${offreId}/vendeur-accepter/`,
      {},
      { withCredentials: true }
    );
  }

  vendeurRejeter(offreId: string, message = ''): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/offres/${offreId}/vendeur-rejeter/`,
      { message },
      { withCredentials: true }
    );
  }

  // Vendeur fait une nouvelle contre-proposition au client
  vendeurContreProposer(
    offreId: string, 
    nouveauPrix: number, 
    message = ''
  ): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/offres/${offreId}/vendeur-contre-proposer/`,
      { prix_client: nouveauPrix, message },   // ContreOffreSerializer attend prix_client
      { withCredentials: true }
    );
  }

  getOffresReservation(reservationId: string): Observable<OffreNegociation[]> {
    return this.http.get<OffreNegociation[]>(
      `${this.apiUrl}/offres/?reservation=${reservationId}`,
      { withCredentials: true }
    );
  }
}