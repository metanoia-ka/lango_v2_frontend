import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Connection } from "../../components/connexion-status/service/connexion-status";
import { catchError, tap, throwError } from "rxjs";

export const serverStatusInterceptor: HttpInterceptorFn = (req, next) => {
  const connectionService = inject(Connection);

  return next(req).pipe(
    tap(() => connectionService.setOnline(true)),
    catchError((error: HttpErrorResponse) => {
      if (error.status === 0) {
        // Erreur réseau : serveur non joignable
        connectionService.setOnline(false);
      }
      return throwError(() => error);
    })
  );
};