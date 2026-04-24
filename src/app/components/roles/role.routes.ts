import { Routes } from "@angular/router";
import { RoleListComponent } from "./role-list/role-list.component";

export const ROLES_ROUTES: Routes = [
    {
        path: '',
        component: RoleListComponent,
        title: 'Gestion des rôles'
    },
    {
        path: 'new',
        component: RoleListComponent,
        title: 'Création d\'un rôle'
    },
    {
        path: ':id',
        component: RoleListComponent,
        title: 'Modification d\'un rôle'
    }
]