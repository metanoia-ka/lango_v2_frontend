import { Routes } from "@angular/router";
import { MesAnnonces } from "./my-annoncement/mes-annonces/mes-annonces";
import { AnnonceList } from "./new/annonce-list/annonce-list";
import { AnnonceDetail } from "./new/annonce-detail/annonce-detail";

export const PUBLIC_ANNONCES_ROUTES: Routes = [
  {
    path: '',
    component: AnnonceList,
    title: 'Annonces disponibles'
  },
  {
    path: ':id/detail',
    component: AnnonceDetail,
    title: 'Détail de l\'annonce'
  }
];

export const MES_ANNONCE_ROUTES: Routes = [
  {
    path: '',
    component: MesAnnonces,
    title: 'Mes annonces disponibles'
  },
  {
    path: ':id/detail',
    component: AnnonceDetail,
    title: 'Détail de l\'annonce'
  }
]