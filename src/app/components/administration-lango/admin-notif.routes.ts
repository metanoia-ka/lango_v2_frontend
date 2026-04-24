import { Routes } from "@angular/router";
import { AdminNotification } from "./admin-notificaton/admin-notification";

export const ADMIN_NOTIF_ROUTES: Routes = [
  {
    path: '',
    component: AdminNotification,
    title: 'Administration notifications'
  }
]