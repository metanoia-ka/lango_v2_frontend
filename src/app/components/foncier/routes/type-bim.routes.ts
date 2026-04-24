import { Routes } from "@angular/router";
import { authGuard } from "../../../auth/core/guards/auth.guard";
import { roleGuard } from "../../../auth/core/guards/role.guard";
import { unauthorizedGuard } from "../../../auth/core/guards/unauthorized.guard";
import { CategorieTypeBien } from "../categorie-type-bien/categorie-type-bien";

export const TYPE_BIEN_IMMOBILIER: Routes = [
  {
    path: 'categories-types',
    component: CategorieTypeBien,
    canActivate: [authGuard, roleGuard, unauthorizedGuard],
    data: { roles: ['Admin', 'Manager'] },
    title: 'Catégories et types de bien'
  }
]