import { Routes } from "@angular/router";
import { VerificationList } from "./verification-list/verification-list";

export const VERIFICATIONS_ROUTES: Routes = [
   {
      path: '',
      component: VerificationList,
      title: 'Gestion des vérifications'
   }
]