export interface SidebarItem {
  label: string;
  icon?: string;
  route?: string;
  roles?: string[];
  hiddenForRoles?: string[];
  requiresAuth?: boolean;
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    label: 'Accueil',
    route: '/lango/home',
    icon: 'bi-house-door',
  },
  {
    label: 'Envoi des notifications',
    route: '/lango/administration-notification',
    icon: 'bi-send',
    roles: ['Admin'],
    requiresAuth: true
  },
  {
    label: 'Messagerie',
    route: '/lango/admin/messagerie',
    icon: 'bi-inbox-fill',  //'bi-inbox-fill'
    roles: ['Admin'],
    requiresAuth: true
  },
  {
    label: 'Remboursements',
    route: '/lango/admin/remboursement-mouvements',
    icon: 'bi-arrow-counterclockwise',  // bi-arrow-return-left, bi-arrow-return-right
    roles: ['Admin'],
    requiresAuth: true
  },
  {
    label: 'Mes messages',
    route: '/lango/mes-messages',
    icon: 'bi-envelope-paper',
    roles: ['Vendor', 'Purchaser'],
    requiresAuth: true,
    hiddenForRoles: ['Agent', 'Admin']
  },
  {
    label: 'Dashboard Agent',
    route: '/lango/verifications-annonces',
    icon: 'bi-check2-square',
    roles: ['Agent'],
    hiddenForRoles: ['Admin'],
    requiresAuth: true
  },
  {
    label: 'Zone de compétence',
    route: '/lango/verifications-annonces/administration/zones-de-competence',
    icon: 'bi-diagram-3-fill',
    roles: ['Admin'],
    hiddenForRoles: ['Agent'],
    requiresAuth: true
  },
  {
    label: 'Mon profil',
    route: '/lango/profile/me',
    icon: 'bi-person-circle',
    requiresAuth: true,
    hiddenForRoles: ['Agent'],
    roles: ['Purchaser', 'Vendor', 'Admin', 'Manager']
  },
  {
    label: 'Ma communauté',
    route: '/lango/ma-communauté',
    icon: 'bi bi-people-fill',
    roles: ['Purchaser', 'Vendor', 'Admin', 'Manager'],
    hiddenForRoles: ['Agent'],
    requiresAuth: true
  },
  {
    label: 'Services Premium',
    route: '/lango/premium',
    icon:  'bi-gem',
    requiresAuth: true,
    roles: ['Purchaser', 'Vendor', 'Admin', 'Manager']
  },
  {
    label: 'Mes crédits',
    route: '/lango/credits',
    icon: 'bi-coin',
    hiddenForRoles: ['Agent'],
    requiresAuth: true,
  },
  {
    label: 'Administration - packs crédits',
    route: '/lango/packs-credits',
    icon: 'bi-stack',
    requiresAuth: true,
    roles: ['Admin']
  },
  {
    label: 'Abonnements',
    route: '/lango/abonnements/plans',
    icon: 'bi-card-checklist',
    requiresAuth: true,
    roles: ['Admin', 'Vendor']
  },
  {
    label: 'Administration - plans abonnements',
    route: '/lango/abonnements/admin-plans',
    icon: 'bi-sliders',
    requiresAuth: true,
    roles: ['Admin']
  },
  {
    label: 'Mon abonnement',
    route: '/lango/abonnements/mon-abonnement',
    icon: 'bi-person-badge',
    requiresAuth: true,
    roles: ['Admin', 'Manager', 'Vendor']
  },
  {
    label: 'Mes réservations',
    route: '/lango/mes-reservations',
    icon: 'bi-bookmark-check',
    requiresAuth: true,
    roles: ['Purchaser']
  },
  {
    label: 'Utilisateurs',
    route: '/lango/users',
    icon: 'bi-people',
    roles: ['Admin'],
    requiresAuth: true
  },
  {
    label: 'Rôles',
    icon: 'bi-shield-check',
    route: '/lango/roles',
    roles: ['Admin'],
    requiresAuth: true
  },
  {
    label: 'Vérifications',
    icon: 'bi-check-circle',
    route: '/lango/verifications',
    roles: ['Admin'],
    requiresAuth: true
  },
  {
    label: 'Types annonces',
    icon: 'bi-tags',
    route: '/lango/types-annonces',
    roles: ['Admin'],
    requiresAuth: true
  },
  {
    label: 'Annonces publiées',
    icon: 'bi-megaphone',
    route: '/lango/annonces',
    requiresAuth: false,
    hiddenForRoles: ['Agent']
  },
  {
    label: 'Mes annonces',
    icon: 'bi-list-check',
    route: '/lango/mes-annonces',
    requiresAuth: true,
    roles: ['Admin', 'Manager', 'Vendor']
  },
  {
    label: 'Système de coordonnées',
    icon: 'bi-crosshair',
    route: '/lango/systemes-coordonnees',
    roles: ['Admin'],
    requiresAuth: true
  },
  {
    label: 'Catégories et types',
    icon: 'bi-file-earmark-text-fill',
    route: '/lango/categories-types-biens-immobiliers/categories-types',
    requiresAuth: true,
    roles: ['Admin']
  },
  {
    label: 'Biens immobiliers',
    icon: 'bi-buildings',
    route: '/lango/biens-immobiliers',
    requiresAuth: true,
    roles: ['Admin', 'Manager', 'Vendor']
  },
  {
    label: 'Espaces événementiels',
    icon: 'bi-stars',
    route: '/lango/evenementiel/espaces',
    roles: ['Vendor', 'Admin'],
    requiresAuth: true,
    hiddenForRoles: ['Agent']
  },
  {
    label: 'Titre foncier',
    icon: 'bi-journal',
    route: '/lango/titres-fonciers',
    requiresAuth: true,
    roles: ['Admin', 'Manager', 'Vendor']
  },
  {
    label: 'Lotissements',
    icon: 'bi-grid-3x3-gap-fill',
    route: '/lango/lotissements',
    requiresAuth: true,
    roles: ['Admin', 'Manager', 'Vendor']
  },
  {
    label: 'Carte cadastrale',
    icon: 'bi-map',
    route: '/lango/foncier/map',
    requiresAuth: true,
    roles: ['Admin', 'Manager'],
  }
];