import { 
  HttpErrorResponse, HttpHandlerFn, 
  HttpInterceptorFn, HttpRequest 
} from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from "rxjs";
import { Authentication } from "./authentication";

const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/refresh',
  '/auth/register',
  '/auth/recover-password',
  '/auth/check-availability'
]

let isRefreshing = false;
let refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

export const sessionExpiredInterceptor: HttpInterceptorFn = (req, next) => {
  
  const auth = inject(Authentication);
  const router = inject(Router);

  const isApiRequest = req.url.includes('/api/') || req.url.includes('/auth/');
  const authReq = isApiRequest ? req.clone({ withCredentials: true }) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (
        error.status !== 401 ||
        !shoulHandled401(req.url) ||
        req.url.includes('/auth/refresh') ||
        !auth.isAuthenticated()
      ) {
        return throwError(() => error);
      }

      if (!isRefreshing) {
        isRefreshing = true;
        refreshTokenSubject.next(null);

        return auth.refreshToken().pipe(
          switchMap((response: any) => {
            console.log('[Refresh] Succès');
            isRefreshing = false;
            refreshTokenSubject.next(true);
            return next(authReq);
          }),
          catchError(refreshErr => {
            console.error('[Refresh] Échec', refreshErr);
            isRefreshing = false;
            refreshTokenSubject.next(false); 
            
            if (!router.url.startsWith('/auth')) {
              auth.logout().subscribe(() => {
                router.navigate(['/auth/login'], 
                  { queryParams: { reason: 'session-expired' } }
                );
              });
            }
            return throwError(() => refreshErr);
          })
        );
      } else {
        return refreshTokenSubject.pipe(
          filter(status => status !== null),
          take(1),
          switchMap(
            status => status === true 
            ? next(authReq) 
            : throwError(() => new Error('Refresh failed')))
        );
      }
    })
  );
};

function shoulHandled401(url: string): boolean {
  return !PUBLIC_ENDPOINTS.some(endpoint => url.includes(endpoint));
}

const handle401Error = (
  request: HttpRequest<any>, next: HttpHandlerFn, auth: Authentication, router: Router
) => {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return auth.refreshToken().pipe(
      switchMap((token: any) => {
        isRefreshing = false;
        refreshTokenSubject.next(token);
        return next(request);
      }),
      catchError((err) => {
        isRefreshing = false;
        auth.logout().subscribe({
          complete: () => {
             router.navigate(['/auth/login'], { 
               queryParams: { reason: 'session-expired' } 
             });
          }
        })

        return throwError(() => err);
      })
    );
  } else {
    return refreshTokenSubject.pipe(
      filter(token => !!token),
      take(1),
      switchMap(() => {
        return next(request);
      })
    );
  }
};