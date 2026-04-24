import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { map } from "rxjs";
import { CauseDebit } from "../../../components/finance/models/credit.model";
import { CreditService } from "../../../components/finance/services/credit";

export const creditSoldeGuard = (
  action: CauseDebit, redirectUrl: string = '/credits/acheter'
) => {
  return () => {
    const creditService = inject(CreditService);
    const router = inject(Router);

    return creditService.getSolde(action).pipe(
      map((soldeCheck) => {
        if (soldeCheck.solde_suffisant) {
          return true;
        }
        return router.createUrlTree([redirectUrl], {
          queryParams: { action, required: soldeCheck.cout_action }
        });
      })
    );
  };
};