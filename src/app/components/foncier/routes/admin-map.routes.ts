import { Routes } from "@angular/router";
import { AdminMap } from "../admin/admin-map/admin-map";
import { authGuard } from "../../../auth/core/guards/auth.guard";
import { roleGuard } from "../../../auth/core/guards/role.guard";

export const ADMIN_MAP_ROUTES: Routes = [
  {
    path: 'map',
    component: AdminMap,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Admin', 'Manager'] },
    title: 'Carte cadastrale globale',
  }
]