import { inject, Injectable } from "@angular/core";
import { environnement } from "../../../../environnements/environnement";
import { HttpClient, HttpParams } from "@angular/common/http";
import { BehaviorSubject, catchError, Observable, tap, throwError } from "rxjs";
import { SystemeCoordonnees } from "../models/coordinate-system";

@Injectable({ providedIn: 'root' })
export class SCoordinateSystem {

  private apiUrl = environnement.apiBaseUrl;
  private http = inject(HttpClient);

  private endpoint = `${this.apiUrl}/coordinate-systems/`;

  private coordinateSystemsSubject = new BehaviorSubject<SystemeCoordonnees[]>([]);
  coordinateSystem$ = this.coordinateSystemsSubject.asObservable();

  fetchCoordinateSystems(): void {
    const url = this.endpoint;
    this.http.get<SystemeCoordonnees[]>(url).subscribe({
      next: (sys) => this.coordinateSystemsSubject.next(sys),
      error: (err) => {
        console.error('Erreur fetchCoordinateSystems', err);
      }
    });
  }


  get currentSystems(): SystemeCoordonnees[] {
        return this.coordinateSystemsSubject.getValue();
    }

  getCoordinateSystems(params?: HttpParams): Observable<SystemeCoordonnees[]> {
    const url = this.endpoint;
    return this.http.get<SystemeCoordonnees[]>(url, { params }).pipe(
      tap(systems => this.coordinateSystemsSubject.next(systems)),
      catchError(err => {
        return throwError(() => err);
      })
    );
  }

  getCoordinateSystemById(systemId: string): Observable<SystemeCoordonnees> {
    const url = `${this.endpoint}${systemId}/`;
    return this.http.get<SystemeCoordonnees>(url).pipe(
      catchError(err => {
        return throwError(() => err);
      })
    );
  }

  createCoordinateSystem(
    data: Partial<SystemeCoordonnees>
  ): Observable<SystemeCoordonnees> {
    const url = this.endpoint;
    return this.http.post<SystemeCoordonnees>(url, data).pipe(
      tap(mewSystem => {
        const updated = [...this.coordinateSystemsSubject.getValue(), mewSystem];
        this.coordinateSystemsSubject.next(updated);
      }),
      catchError(err => {
        return throwError(() => err);
      })
    );
  }
  
  updateCoordinateSystem(
    systemId: string, data: Partial<SystemeCoordonnees>
  ): Observable<SystemeCoordonnees> {
    const url = `${this.endpoint}${systemId}/`;
    return this.http.patch<SystemeCoordonnees>(url, data).pipe(
      tap(updateSystem => {
        const list = this.coordinateSystemsSubject.getValue()
                         .map(t => (t.id === updateSystem.id ? updateSystem : t));
        this.coordinateSystemsSubject.next(list);
      }),
      catchError(err => {
        return throwError(() => err);
      })
    );
  }

  deleteCoordinateSystem(systemId: string): Observable<void> {
    const url = `${this.endpoint}${systemId}/`;
    return this.http.delete<void>(url).pipe(
      tap(() => this.getCoordinateSystems()),
      catchError(err => {
        return throwError(() => err);
      })
    );
  }

  checkSRIDAvailable(srid: number): Observable<{ srid: number, exists: boolean }> {
    return this.http.get<{ srid: number, exists: boolean }>(
      `${this.endpoint}available/${srid}/`
    );
  }

  getAvailableSystems(): Observable<SystemeCoordonnees[]> {
    return this.http.get<SystemeCoordonnees[]>(`${this.endpoint}available-systems/`);
  }
  
  convertCoordinates(
    systemId: string, lat: number, lng: number, fromSrid: number = 4326
  ): Observable<any> {
    const params = new HttpParams()
      .set('lat', lat.toString())
      .set('lng', lng.toString())
      .set('from_srid', fromSrid.toString());
    
    return this.http.get(
      `${this.endpoint}${systemId}/convert-coordinates/`, { params }
    );
  }

}