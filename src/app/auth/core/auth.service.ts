import { Inject, inject, Injectable, PLATFORM_ID, signal } from "@angular/core";
import { environnement } from "../../../environnements/environnement";
import { HttpClient, HttpParams } from "@angular/common/http";

import { ActivatedRoute ,Router } from "@angular/router";
import { BehaviorSubject, map, Observable, of, switchMap, tap } from "rxjs";
import { isPlatformBrowser } from '@angular/common';

interface LoginResponse {
    access: string;
    refresh: string;
    user: {
      identifier: string | number;
      phone?: number;
      roles: string[];
      is_active: boolean;
      person_id?: string;
    };
}

interface UserProfile {
    identifier: string;
    roles: string[];
    is_active: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  
  private router = inject(Router);
  private platformId: Object;

  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private userSubject = new BehaviorSubject<any | null>(null);
  user$ = this.userSubject.asObservable();

  private BASE_URL = `${environnement.apiBaseUrl}/auth`;

  user = signal<LoginResponse['user'] | null>(null);

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.platformId = platformId; // Assigne le PLATFORM_ID injecté

  }

  login(credentials: { identifier: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.BASE_URL}/login/`, credentials, { withCredentials: true }
    ).pipe(
      tap(response => {
        this.user.set(response.user);
      })
    );
  }

  logout(): void {
    const lastUrl = this.router.url;
    
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('last_url', lastUrl);
    }

    this.user.set(null);

    this.router.navigate(['/home']);
  }

  checkAvailability(field: 'username' | 'phone', value: string) {
    const params = new HttpParams().set(field, value);
    return this.http.get<{ field: string; exists: boolean; message: string }>(
      `${this.BASE_URL}/check-availability/`,
      { params }
    );
  }

  get currentUserValue() {
    return this.currentUserSubject.value;
  }

  setSession(response: LoginResponse) {
    this.user.set(response.user);
  }

  isAuthenticated() {
    //return this.isLoggedInSubject.getValue();
  }

  hasRole(requiredRoles: string[]): boolean | null {
    const user = this.user();
    return user && requiredRoles.some(role => user.roles.includes(role));
  }

  checkUsername(identifier: string | number) {
    return this.http.get<{ exists: boolean }>
            (`${this.BASE_URL}/check-login/?identifier=${identifier}`)
            .pipe(
              switchMap(res => of(res.exists)),
            );
  }

  checkCredentials(identifier: string | number, password: string): Observable<boolean> {
    return this.http.post<{ valid: boolean }>
            (`${this.BASE_URL}/check-credentials/`, { identifier, password })
            .pipe(map(res => res.valid));
  }

  getRedirectAfterLogin(route: ActivatedRoute): string {
    const redirect = route.snapshot.queryParamMap.get('redirect');
    const lastUrl = localStorage.getItem('last_url');

    return redirect ?? lastUrl ?? '/home';
  }

  forceLogout() {
    this.userSubject.next(null);
  }

  refresh(){
    return this.http.post(`${this.BASE_URL}/refresh/`, {}, { withCredentials: true })
  }

  authLogout(){
    this.userSubject.next(null);

    return this.http.post(
      `${this.BASE_URL}/logout/`, 
      {}, 
      { withCredentials: true }
    ).subscribe()
  }

  getRedirectRouteForRoles(roles: string[]): string {
    return '/home';
  }

  loadMe() {
    this.http.get(`${this.BASE_URL}/me/`).subscribe(user => {
      this.userSubject.next(user);
    });
  }
}
