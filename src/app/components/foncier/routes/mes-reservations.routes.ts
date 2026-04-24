import { Routes } from '@angular/router';
import { authGuard } from '../../../auth/core/guards/auth.guard';
import { MesReservations } from '../mes-reservations/mes-reservations/mes-reservations';

export const RESERVATION_ROUTES: Routes = [
  {
    path: 'mes-reservations',
    component: MesReservations,
    canActivate: [authGuard],
    data: { roles: ['Purchaser'] },
    title: 'Mes réservations',
  },
];