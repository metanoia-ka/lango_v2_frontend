import { Routes } from "@angular/router";
import { PackCreditList } from "../credits/pack-credit-list/pack-credit-list";
import { roleGuard } from "../../../auth/core/guards/role.guard";
import { authGuard } from "../../../auth/core/guards/auth.guard";
import { unauthorizedGuard } from "../../../auth/core/guards/unauthorized.guard";

export const PACK_CREDIT_ROUTES: Routes = [
  {
    path:        '',
    component:   PackCreditList,
    canActivate: [authGuard, roleGuard, unauthorizedGuard],
    data:        { roles: ['Admin'] },
    title:       'Packs de crédits'
  }
];