import { inject } from "@angular/core";
import { tap } from "rxjs";
import { CreditService } from "../../components/finance/services/credit";
import { HttpInterceptorFn } from "@angular/common/http";

export const sessionInfoInterceptor: HttpInterceptorFn = (req, next) => {
  const creditService = inject(CreditService);
 
  return next(req).pipe(
    tap(event => {
      if ((event as any).headers) {
        const headers = (event as any).headers;
 
        const solde = headers.get('X-Credit-Solde');
        if (solde !== null) {
          creditService.solde.set(parseInt(solde, 10));
        }
 
        const restants = headers.get('X-Free-Views-Remaining');
        if (restants !== null) {
          //creditService.freeViewsRestants.set(parseInt(restants, 10));
        }
      }
    })
  );
};