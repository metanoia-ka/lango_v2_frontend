import { Routes } from "@angular/router";
import { 
  CoordinateSystemList 
} from "../coordinate-system/coordinate-system-list/coordinate-system-list";
import { authGuard } from "../../../auth/core/guards/auth.guard";
import { roleGuard } from "../../../auth/core/guards/role.guard";

export const SYSTEM_COORDINATE_ROUTES: Routes = [
  {
    path: '',
    component: CoordinateSystemList,
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Admin'] },
    title: 'Liste des systèmes de coordonnées'
  }
]