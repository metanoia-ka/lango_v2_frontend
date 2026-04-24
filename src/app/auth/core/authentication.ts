import { HttpClient } from "@angular/common/http";
import { Inject, inject, Injectable, PLATFORM_ID, signal } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { 
  BehaviorSubject, catchError, map, 
  Observable, of, switchMap, tap, throwError 
} from "rxjs";
import { environnement } from "../../../environnements/environnement";
import { isPlatformBrowser } from "@angular/common";
import { RegisterRequest, RegisterResponse } from "../features/models/user-modif.model";
import { PresenceService } from "../../components/messaging/services/personne";


export interface User {
  id?: string;
  username: string;
  phone: string;
  roles: string[];
  avatar_user?: string;
  is_active: boolean;
  created_at?: string | undefined;
  updated_at?: string | undefined;
}

export interface SuccessResponse {
  success: boolean;
  message: string;
  profil_cree: boolean;
  user: User;
  profil: any;
}

export interface AvailabilityCheck {
  field: string;
  exists: boolean;
  message: string;
}

interface RecoverData {
  identifier: string;
}

interface RecoverConfirmData {
  identifier: string;
  secret_answer: string;
  new_password: string;
  confirm_password: string;
}

interface ChangePasswordData {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

@Injectable({ providedIn: 'root' })
export class Authentication {

  private http = inject(HttpClient);
  private router = inject(Router)
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private presenceSvc = inject(PresenceService);

  currentUserSignal = signal<User | null>(null);
  isLoadingAuth = signal(true);

  private BASE_URL = `${environnement.apiBaseUrl}/auth`;
  private base = environnement.apiBaseUrl;
  platformId: Object;

  private initialized: boolean = false;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.platformId = platformId;
    //this.currentUser$.subscribe(user => this.currentUserSignal.set(user));
    if (isPlatformBrowser(this.platformId)) {
      this.http.get<User>(`${this.base}/me/`, { withCredentials: true }).subscribe({
        next: (user) => {
          this.currentUserSignal.set(user);
          this.isLoadingAuth.set(false);
        },
        error: () => {
          this.currentUserSignal.set(null);
          this.isLoadingAuth.set(false);
        }
      });
    }
  }

  init(): Promise<void> {
    return new Promise(resolve => {
      if (this.initialized) { resolve(); return; }
      this.initialized = true;

      this.loadUser().pipe(
        catchError(() => of(null))
      ).subscribe({
        complete: () => resolve(),
        error:    () => resolve()
      });
    });
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }
  
  register(data: RegisterRequest): Observable<RegisterResponse> {
    
    if (data.preuve_legale) {
      const formData = new FormData();
      
      // Ajouter tous les champs au FormData
      Object.keys(data).forEach(key => {
        const value = (data as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          if (key === 'preuve_legale') {
            formData.append(key, value);
          } else {
            formData.append(key, String(value));
          }
        }
      });

      return this.http.post<RegisterResponse>(
        `${this.BASE_URL}/register/`, 
        formData,
        { withCredentials: true }
      ).pipe(
          tap((response: any) => {
            console.log('Utilisateur enregistré avec preuve légale:', response);
          }),
          catchError((err) => {
            return throwError(() => err);
          })
        );
    }

    return this.http.post<RegisterResponse>(
      `${this.BASE_URL}/register/`, 
      data,
      { withCredentials: true }
    ).pipe(
        tap((response: any) => {
          console.log('Utilisateur enregistré sans preuve légale:', response);
        }),
        catchError((err) => {
          return throwError(() => err);
        })
      );
  }

  login(credentials: { identifier: string; password: string }): Observable<User> {
    return this.http.post<SuccessResponse>(
      `${this.BASE_URL}/login/`, credentials, { withCredentials: true }).pipe(
      tap(() => this.presenceSvc.connect()),
      map(response => {
        const user = { 
          ...response.user, 
          username: (response.user as any).identifier || response.user.username 
        };
        this.currentUserSubject.next(user);
        return user;
      })
    );
  }

  loadUser(): Observable<User | null> {
    return this.http.get<any>(
      `${environnement.apiBaseUrl}/me/`, { withCredentials: true }
    ).pipe(
      map(response => response.user),
      tap(user => this.currentUserSubject.next(user)),
      catchError(() => {
        this.currentUserSubject.next(null);
        return of(null);
      })
    );
  }

  loadMeFull(): Observable<SuccessResponse> {
    return this.http.get<SuccessResponse>(
      `${environnement.apiBaseUrl}/me/`,
      { withCredentials: true }
    );
  }

  updateProfileUser(personData: any): Observable<any> {
    return this.http.patch<any>(
      `${environnement.apiBaseUrl}/me/`, personData, { withCredentials: true }
    ).pipe(
      catchError(err => {
        return throwError(() => err)
      })
    );
  }

  clearSession() {
    this.currentUserSubject.next(null);
  }

  logout(): Observable<any> {
    this.presenceSvc.disconnect();
    const lastUrl = this.router.url;
        
    if (isPlatformBrowser(this.platformId!)) {
      localStorage.setItem('last_route', lastUrl);
    }

    return this.http.post(`${this.BASE_URL}/logout/`, {}, { withCredentials: true }).pipe(
      tap(() => {
        this.currentUserSubject.next(null);
        this.router.navigate(['/lango/annonces']);
      }),
      catchError((err) => {
        return throwError(() => err);
      })
    );
  }

  refreshToken(): Observable<any> {
    return this.http.post(`${this.BASE_URL}/refresh/`, {}, { withCredentials: true }).pipe(
      catchError((err) => {
        return throwError(() => err);
      })
    )
  }

  checkAvailability(
    field: 'username' | 'phone', value: string
  ): Observable<AvailabilityCheck> {
    return this.http.get<AvailabilityCheck>(`${this.BASE_URL}/check-availability/`, {
      params: { [field]: value }
    }).pipe(
      catchError((err) => {
        return throwError(() => err);
      })
    );
  }
  
  changePassword(
    changeData: ChangePasswordData
  ): Observable<any> {
    return this.http.post(
      `${this.BASE_URL}/change-password/`, changeData, { withCredentials: true }
    ).pipe(
      catchError((err) => {
        return throwError(() => err);
      })
    );
  }

  recoverPassword(recoverData: RecoverData): Observable<{ secret_question: string }> {
    return this.http.post<{ secret_question: string }>(
      `${this.BASE_URL}/recover/`, recoverData, { withCredentials: true }
    ).pipe(
      catchError((err) => {
        return throwError(() => err);
      })
    );
  }

  recoverPasswordConfirm(
    confirmData: RecoverConfirmData
  ): Observable<any> {
    return this.http.post(
      `${this.BASE_URL}/recover/confirm/`, confirmData, { withCredentials: true }
    ).pipe(
      catchError((err) => {
        return throwError(() => err);
      })
    );
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    return user?.roles?.includes(role) || false;
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.currentUserSubject.value;
    if (!user?.roles) return false;
    return roles.some(role => user.roles.includes(role));
  }

  isAuthenticated(): Observable<boolean> {
    return this.currentUser$.pipe(
      map(user => !!user),
      switchMap(hasUser => {
        if (hasUser) {
          return of(true);
        }
        // Si pas d'utilisateur en cache, tenter de le charger
        return this.loadUser().pipe(
          map(() => true),
          catchError(() => of(false))
        );
      })
    );
  }

  getRedirectAfterLogin(route: ActivatedRoute): string {
    const redirect = route.snapshot.queryParamMap.get('returnUrl');
    const lastRoute = localStorage.getItem('last_route');
  
    return redirect ?? lastRoute ?? '/lango/home';
  }
}