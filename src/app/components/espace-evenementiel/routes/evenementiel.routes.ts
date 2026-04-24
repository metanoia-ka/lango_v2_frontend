import { Routes } from '@angular/router';
import { roleGuard } from '../../../auth/core/guards/role.guard';
import { unauthorizedGuard } from '../../../auth/core/guards/unauthorized.guard';
import { authGuard } from '../../../auth/core/guards/auth.guard';

export const EVENEMENTIEL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../espace-list/espace-list').then(
        (m) => m.EspaceList
      ),
    canActivate: [authGuard, roleGuard, unauthorizedGuard],
    data: { 
      roles: ['Admin', 'Manager', 'Vendor']
    },
    title: 'Espaces événementiels',
  },
  {
    path: 'nouveau',
    loadComponent: () =>
      import('../espace-form/espace-form').then(
        (m) => m.EspaceForm
      ),
    canActivate: [authGuard, roleGuard, unauthorizedGuard],
    data: { 
      roles: ['Admin', 'Manager', 'Vendor']
    },
    title: 'Publier un espace',
  },
  {
    path: ':id/modifier',
    loadComponent: () =>
      import('../espace-form/espace-form').then(
        (m) => m.EspaceForm
      ),
    canActivate: [authGuard, roleGuard, unauthorizedGuard],
    data: { 
      roles: ['Admin', 'Manager', 'Vendor']
    },
    title: 'Modifier l\'espace',
  },
  {
    path: ':id/detail',
    loadComponent: () =>
      import('../espace-detail/espace-detail').then(
        (m) => m.EspaceDetail
      ),
    canActivate: [authGuard, roleGuard, unauthorizedGuard],
    data: { 
      roles: ['Admin', 'Manager', 'Vendor']
    },
    title: 'Détail espace événementiel',
  }
];