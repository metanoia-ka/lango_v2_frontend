import { Routes } from '@angular/router';
import { roleGuard } from './auth/core/guards/role.guard';
import { authGuard } from './auth/core/guards/auth.guard';
import { MainLayout } from './layout/auth-main-layout/main-layout/main-layout';
import { AuthLayout } from './layout/auth-main-layout/auth-layout/auth-layout';
import { UnauthorizedPage } from './auth/features/unauthorized-page/unauthorized-page';
import { unauthorizedGuard } from './auth/core/guards/unauthorized.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },

  // 🔐 Routes d'auth (login/register/unauthorized)
  {
    path: 'auth',
    component: AuthLayout,
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./auth/features/login/login')
            .then(m => m.LoginComponent),
        title: 'Connexion'
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./auth/features/register-purchaser/register-purchaser')
            .then(m => m.RegisterPurchaser),
        title: 'Inscription'
      },
      {
        path: 'recover-password',
        loadComponent: () =>
          import('./auth/features/recover-password/recover-password')
            .then(m => m.RecoverPassword),
        title: 'Mot de passe oublié'
      },
      {
        path: 'change-password',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./auth/features/change-password/change-password')
            .then(m => m.ChangePassword),
        title: 'Changer le mot de passe'
      }
    ]
  },

  {
    path: 'lango/unauthorized',
    component: UnauthorizedPage,
    title: 'Accès non autorisé',
  },

  // 🏠 Routes principales (avec sidebar + header)
  {
    path: 'lango',
    component: MainLayout,
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('./components/home/home.component')
            .then(m => m.HomeComponent),
        title: 'Accueil'
      },
      {
        path: 'roles',
        loadChildren: () => import(
          './components/roles/role.routes'
        ).then(m => m.ROLES_ROUTES),
        canActivate: [authGuard, roleGuard, unauthorizedGuard],
        data: { roles: ['Admin'] },
      },
      {
        path: 'users',
        loadChildren: () => import(
          './components/users/user.routes'
        ).then(m => m.USERS_ROUTES),
        canActivate: [authGuard, roleGuard, unauthorizedGuard],
        data: { roles: ['Admin'] },
      },
      {
        path: 'verifications',
        loadChildren: () => import(
          './auth/features/verification/verification.routes'
        ).then(m => m.VERIFICATIONS_ROUTES),
        canActivate: [authGuard, roleGuard, unauthorizedGuard],
        data: { roles: ['Admin'] },
      },
      {
        path: 'administration-notification',
        loadChildren: () => import(
          './components/administration-lango/admin-notif.routes'
        ).then(m => m.ADMIN_NOTIF_ROUTES),
        canActivate: [authGuard, roleGuard, unauthorizedGuard],
        data: { roles: ['Admin'] },
      },
      {
        path: '',
        loadChildren: () => import(
          './components/messaging/messaging.routes'
        ).then(m => m.MESSAGING_ROUTES)
      },
      {
        path: 'admin',
        loadChildren: () => import(
          './components/messaging/messaging.routes'
        ).then(m => m.ADMIN_MESSAGING_ROUTES)
      },
      {
        path: 'premium',
        loadChildren: () =>
          import('./components/finance/routes/premium.routes')
            .then(m => m.PREMIUM_ROUTES),
        //data: { roles: ['Admin', 'Manager', 'Purchaser', 'Vendor'] }
      },
      {
        path: 'profile/me',
        loadComponent: () => import(
          './auth/features/profile-me/profile-me'
        ).then(m => m.ProfileMe),
        title: 'Mon profil',
        canActivate: [authGuard, roleGuard, unauthorizedGuard],
        data: { roles: ['Admin', 'Vendor', 'Purchaser'] },
      },
      {
        path: 'ma-communauté',
        loadComponent: () => import(
          './components/annonces/mes-follows/mes-follows'
        ).then(m => m.MesFollows),
        title: 'Ma communauté',
        canActivate: [authGuard, roleGuard, unauthorizedGuard],
        data: { roles: ['Admin', 'Vendor', 'Purchaser'] },
      },
      {
        path: 'types-annonces',
        loadChildren: () => import(
          './components/annonces/type-annonce.routes'
        ).then(m => m.TYPES_ANNONCES)
      },
      {
        path: 'annonces',
        loadChildren: () => import(
          './components/annonces/my-annonce.routes'
        ).then(m => m.PUBLIC_ANNONCES_ROUTES),
      },
      {
        path: 'verifications-annonces',
        loadChildren: () => import(
          './components/annonces/agent/agent-verification.routes'
        ).then(m => m.AGENT_VERIFICATION_ROUTES)
      },
      {
        path: 'credits',
        loadChildren: () => import(
          './components/finance/routes/credit.routes'
        ).then(m => m.CREDIT_ROUTES),
      },
      {
        path: 'admin/remboursement-mouvements',
        loadChildren: () => import(
          './components/finance/routes/mouvement-credit.routes'
        ).then(m => m.MOUVEMENT_CREDIT_ROUTES),
      },
      {
        path: 'packs-credits',
        loadChildren: () => import(
          './components/finance/routes/pack-credit.routes'
        ).then(m => m.PACK_CREDIT_ROUTES)
      },
      {
        path: 'evenementiel/espaces',
        loadChildren: () =>
          import('./components/espace-evenementiel/routes/evenementiel.routes').then(
           (m) => m.EVENEMENTIEL_ROUTES
        ),
      },
      {
        path: 'abonnements',
        loadChildren: () => import(
          './components/finance/routes/abonnement.routes'
        ).then(m => m.ABONNEMENT_ROUTES),
      },
      {
        path: 'mes-annonces',
        loadChildren: () => import(
          './components/annonces/my-annonce.routes'
        ).then(m => m.MES_ANNONCE_ROUTES),
        canActivate: [authGuard, roleGuard],
        data: { 
          roles: ['Admin', 'Manager', 'Vendor']
        }
      },
      {
        path: 'titres-fonciers',
        loadChildren: () => import(
          './components/foncier/routes/titre-foncier.routes'
        ).then(m => m.TITRE_FONCIER_ROUTES),
      },
      {
        path: 'categories-types-biens-immobiliers',
        loadChildren: () => import(
          './components/foncier/routes/type-bim.routes'
        ).then(m => m.TYPE_BIEN_IMMOBILIER)
      },
      {
        path: 'biens-immobiliers',
        loadChildren: () => import(
          './components/foncier/routes/bien-immobilier.routes'
        ).then(m => m.BIEN_IMMOBILIER_ROUTES)
      },
      {
        path: 'lotissements',
        loadChildren: () =>
          import('./components/foncier/routes/lotissement.routes')
            .then(m => m.LOTISSEMENT_ROUTES),
      },
      {
        path: '',
        loadChildren: () =>
          import('./components/foncier/routes/mes-reservations.routes')
            .then(m => m.RESERVATION_ROUTES),
      },
      {
        path: 'systemes-coordonnees',
        loadChildren: () => import(
          './components/foncier/routes/system-coordinate.routes'
        ).then(m => m.SYSTEM_COORDINATE_ROUTES)
      },
      {
        path: 'foncier',
        loadChildren: () => import(
          './components/foncier/routes/admin-map.routes'
        ).then(m => m.ADMIN_MAP_ROUTES),
        
      }
    ]
  }
];