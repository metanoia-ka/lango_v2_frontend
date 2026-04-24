import { Routes } from "@angular/router";
import { UserList } from "./user-list/user-list";

export const USERS_ROUTES: Routes = [
   {
      path: '',
      component: UserList,
      title: 'Gestion des utilisateurs'
   },
   {
      path: 'new',
      component: UserList,
      title: 'Creation d\'un utilisateur'
   },
   {
      path: ':id',
      component: UserList,
      title: 'Modification d\'un utilisateur'
   }
]