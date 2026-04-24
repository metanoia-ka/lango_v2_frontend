import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { Authentication } from "../authentication";

export const roleGuard: CanActivateFn = (route, state) => {

  const auth = inject(Authentication);
  const router = inject(Router);

  const user = auth.currentUserValue;

  if (!user) {
    return router.createUrlTree(['/auth/login']);
  }

  const required = route.data['roles'] as string[] || [];
  if (required.length === 0) return true;

  const hasRole = required.some(r => user.roles.includes(r));

  return hasRole ? true : router.createUrlTree(['/lango/auth/unauthorized']);
}