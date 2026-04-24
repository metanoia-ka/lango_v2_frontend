import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { Authentication } from "../authentication";

// Exemple de guard simple (à mettre sur les routes sensibles)
export const unauthorizedGuard: CanActivateFn = (route, state) => {
  const auth = inject(Authentication);
  const router = inject(Router);

  if (!auth.currentUserSignal()) {
    // Redirige vers unauthorized en gardant l'URL précédente
    router.createUrlTree(['/lango/unauthorized'], {
      queryParams: { returnUrl: state.url }
    });
  }
  return true;
};