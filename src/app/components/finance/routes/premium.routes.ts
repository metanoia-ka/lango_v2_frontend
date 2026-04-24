import { Routes } from "@angular/router";
import { authGuard } from "../../../auth/core/guards/auth.guard";
import { PremiumDashboard } from "../premium/premium-dashboard/premium-dashboard";
import { premiumGuard } from "../../../auth/core/guards/premium.guard";
import { PremiumSouscription } from "../premium/premium-souscription/premium-souscription";

export const PREMIUM_ROUTES: Routes = [
  {
    path:        '',
    component:   PremiumDashboard,
    canActivate: [authGuard, premiumGuard],
    title:       'Services Premium',
  },
  {
    path:        'souscrire',
    component:   PremiumSouscription,
    canActivate: [authGuard],
    title:       'Activer les services Premium',
  },
];