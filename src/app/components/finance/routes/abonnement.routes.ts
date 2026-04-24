import { Routes } from "@angular/router";
import { PlanList } from "../abonnements/plan-list/plan-list";
import { MonAbonnement } from "../abonnements/mon-abonnement/mon-abonnement";
import { authGuard } from "../../../auth/core/guards/auth.guard";
import { roleGuard } from "../../../auth/core/guards/role.guard";
import { 
  PlanAbonnementAdmin 
} from "../abonnements/plan-abonnement-admin/plan-abonnement-admin";
import { unauthorizedGuard } from "../../../auth/core/guards/unauthorized.guard";

export const ABONNEMENT_ROUTES: Routes = [
  {
    path: 'plans',
    component: PlanList,
    canActivate:  [authGuard],
    title: 'Liste des abonnements',
  },
  {
    path:        'admin-plans',
    component:   PlanAbonnementAdmin,
    canActivate: [authGuard, roleGuard, unauthorizedGuard],
    data:        { roles: ['Admin'] },
    title:       'Gestion des plans',
  },
  {
    path: 'mon-abonnement',
    component: MonAbonnement,
    canActivate: [authGuard, roleGuard],
    data:        { roles: ['Admin', 'Vendor', 'Purchaser'] },
    title: 'Mon abonnement'
  },
  { path: '', redirectTo: 'plans', pathMatch: 'full' },
];