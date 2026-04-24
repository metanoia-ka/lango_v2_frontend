import { Routes } from "@angular/router";
import { TypeAnnonceList } from "./type-annonce/type-annonce-list/type-annonce-list";
import { authGuard } from "../../auth/core/guards/auth.guard";
import { roleGuard } from "../../auth/core/guards/role.guard";

export const TYPES_ANNONCES: Routes = [
  {
    path: '',
    component: TypeAnnonceList,
    canActivate: [authGuard, roleGuard],
    data: { 
      roles: ['Admin']
    },
    title: 'Gestion des types d\'annonce'
  }
]