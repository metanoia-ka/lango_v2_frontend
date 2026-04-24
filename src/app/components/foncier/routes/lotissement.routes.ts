import { Routes } from "@angular/router";
import { LotissementList } from "../lotissement/lotissement-list/lotissement-list";
import { ParcelleList } from "../parcelle/parcelle-list/parcelle-list";
import { authGuard } from "../../../auth/core/guards/auth.guard";
import { roleGuard } from "../../../auth/core/guards/role.guard";

export const LOTISSEMENT_ROUTES: Routes = [
  {
    path: '',
    component: LotissementList,
    title: 'Liste des lotissements',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Admin', 'Manager', 'Vendor'] }
  },
  {
    path: ':id/parcelles',
    component: ParcelleList,
    title: 'Liste des parcelles',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Admin', 'Manager', 'Vendor', 'Purchaser'] }
  },
];