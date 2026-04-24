import { Routes } from '@angular/router';
import { MessagingForm } from './messaging-form/messaging-form';
import { MesMessages } from './mes-messages/mes-messages';
import { authGuard } from '../../auth/core/guards/auth.guard';
import { AdminMessaging } from './admin-messaging/admin-messaging';
import { roleGuard } from '../../auth/core/guards/role.guard';

export const MESSAGING_ROUTES: Routes = [
  {
    path: 'contact',
    component: MessagingForm,
    title: 'Nous contacter',
  },
  {
    path: 'mes-messages',
    component: MesMessages, 
    title: 'Mes messages',
    canActivate: [authGuard],
    data: { roles: ['Vendor', 'Purchaser'] },
  },
];

export const ADMIN_MESSAGING_ROUTES: Routes = [
  {
    path: 'messagerie',
    component: AdminMessaging,
    title: 'Messagerie — Administration',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['Admin'] },
  },
];