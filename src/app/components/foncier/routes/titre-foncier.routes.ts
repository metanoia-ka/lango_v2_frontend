import { Routes } from "@angular/router";
import { TitreFoncierList } from "../titre-foncier/titre-foncier-list/titre-foncier-list";
import { authGuard } from "../../../auth/core/guards/auth.guard";
import { roleGuard } from "../../../auth/core/guards/role.guard";
import { unauthorizedGuard } from "../../../auth/core/guards/unauthorized.guard";

export const TITRE_FONCIER_ROUTES: Routes = [
  {
    path: '',
    component: TitreFoncierList,
    canActivate: [authGuard, roleGuard, unauthorizedGuard],
    data: { 
      roles: ['Admin', 'Manager', 'Vendor']
    },
    title: 'Liste des titres fonciers'
  }
]