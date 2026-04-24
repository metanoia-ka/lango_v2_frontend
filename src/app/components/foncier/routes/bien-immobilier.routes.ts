import { Routes } from "@angular/router";
import { 
  BienImmobilierList 
} from "../bien-immobilier/bien-immobilier-list/bien-immobilier-list";
import { authGuard } from "../../../auth/core/guards/auth.guard";
import { roleGuard } from "../../../auth/core/guards/role.guard";

export const BIEN_IMMOBILIER_ROUTES: Routes =[
  {
    path: '',
    component: BienImmobilierList,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Admin', 'Manager', 'Vendor'] },
    title: 'Liste des biens immobiliers'
  }
];