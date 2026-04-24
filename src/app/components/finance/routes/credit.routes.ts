import { Routes } from "@angular/router";
import { CreditDashboard } from "../credits/credit-dashboard/credit-dashboard";
import { roleGuard } from "../../../auth/core/guards/role.guard";
import { authGuard } from "../../../auth/core/guards/auth.guard";
import { TarifActionList } from "../tarif-action-list/tarif-action-list";
import { unauthorizedGuard } from "../../../auth/core/guards/unauthorized.guard";

export const CREDIT_ROUTES: Routes = [
  {
    path: '',
    component: CreditDashboard,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Admin', 'Manager', 'Vendor', 'Purchaser', 'Agent'] },
    title: 'Mes crédits'
  },
  {
    path: 'tarifs',
    component: TarifActionList,
    canActivate: [authGuard, roleGuard, unauthorizedGuard],
    data: { roles: ['Admin', 'Manager'] },
    title: 'Mes Tarifs actions'
  }
];