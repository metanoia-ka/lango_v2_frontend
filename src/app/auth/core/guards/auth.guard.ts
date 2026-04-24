import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { Authentication } from "../authentication";

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(Authentication);
  const router = inject(Router);

  const user = auth.currentUserValue;

  if (user) {
    return true;
  }
  
  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url }
  });
}