import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { CreditService } from "../../../components/finance/services/credit";
import { map } from "rxjs";

export const premiumGuard: CanActivateFn = () => {
  const creditService = inject(CreditService);
  const router        = inject(Router);

  const solde = creditService.solde();

  // Solde déjà chargé et positif → accès direct
  if (solde > 0) return true;

  // Solde non encore chargé → charger et décider
  if (solde === 0) {
    return creditService.getSolde().pipe(
      map(data => {
        if (data.solde > 0) return true;
        router.navigate(['/lango/premium/souscrire']);
        return false;
      })
    );
  }

  router.navigate(['/lango/premium/souscrire']);
  return false;
};