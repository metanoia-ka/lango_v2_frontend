import { inject, Injectable } from "@angular/core";
import { BehaviorSubject, catchError, of, timeout} from "rxjs";
import { environnement } from "../../../../environnements/environnement";
import { HttpClient } from "@angular/common/http";

@Injectable({ providedIn: 'root' })
export class Connection {

  private apiUrl = environnement.apiBaseUrl;
  private endpointHealth = `${this.apiUrl}/health/`;

  private onlineSubject = new BehaviorSubject<boolean>(true);
  isOnline$ = this.onlineSubject.asObservable();

  private http = inject(HttpClient);

  setOnline(status: boolean) {
    this.onlineSubject.next(status);
  }

  checkServerConnexion() {
    const url = `${this.endpointHealth}`;
    this.http.get(url, { responseType: 'arraybuffer' })
    .pipe(
      timeout(5000),
      catchError(() => of(null))
    )
    .subscribe({
      next: (res) => {
        this.setOnline(!!res);
      },
      error: (err) => {
        this.setOnline(false);
      }
    });
  }

  getCurrentStatus(): boolean | null {
    return this.onlineSubject.getValue();
  }
}