import { inject } from '@angular/core';
import { 
  CanActivateFn, Router, 
  ActivatedRouteSnapshot, RouterStateSnapshot 
} from '@angular/router';
import { Authentication } from '../authentication';

export const purchaserLotissementGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const auth   = inject(Authentication);
  const router = inject(Router);
  const user   = auth.currentUserSignal();

  if (!user) {
    return router.createUrlTree(['/lango/unauthorized'], {
      queryParams: { returnUrl: state.url }
    });
  }

  return true;
};