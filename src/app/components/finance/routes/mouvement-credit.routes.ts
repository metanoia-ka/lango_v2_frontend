import { Routes } from "@angular/router";
import { MouvementList } from "../credits/mouvement-list/mouvement-list";
import { unauthorizedGuard } from "../../../auth/core/guards/unauthorized.guard";
import { authGuard } from "../../../auth/core/guards/auth.guard";
import { roleGuard } from "../../../auth/core/guards/role.guard";

export const MOUVEMENT_CREDIT_ROUTES: Routes = [
  {
    path: '',
    component: MouvementList,
    canActivate: [authGuard, roleGuard, unauthorizedGuard],
    data: { roles: ['Admin'] },
    title: 'Remboursement manuel'
  }
];