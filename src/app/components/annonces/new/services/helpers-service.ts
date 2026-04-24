import { AnnonceListItem } from "../models/annonce-new.model";

export function formatPrixAnnonce(annonce: AnnonceListItem): string {
  if (!annonce.prix) return '—';
  const n = parseFloat(annonce.prix).toLocaleString('fr-FR');

  if (annonce.type_bien_annonce === 'EVENEMENTIEL') {
    const tarifs = annonce.espace_evenementiel?.tarifs ?? [];
    if (tarifs.length === 0) return `${n} FCFA`;
    // Afficher le tarif le moins cher avec son unité
    const min = tarifs.reduce((a, b) => a.prix < b.prix ? a : b);
    return `${parseFloat(String(min.prix)).toLocaleString('fr-FR')} FCFA/${min.unite_label}`;
  }

  const tx = annonce.bien?.type_transaction;
  const u  = tx === 'LOCATION' ? 'FCFA/mois' : tx === 'VENTE' ? 'FCFA/m²' : 'FCFA';
  return `${n} ${u}`;
}

export function getPhotoAnnonce(annonce: AnnonceListItem): string | null {
  if (annonce.image_principale) return annonce.image_principale;
  if (annonce.bien?.photo_principale) return annonce.bien.photo_principale;
  if (annonce.espace_evenementiel?.photo_principale) return annonce.espace_evenementiel.photo_principale;
  return null;
}

export function getVilleAnnonce(annonce: AnnonceListItem): string {
  return annonce.bien?.ville_label
      || annonce.espace_evenementiel?.ville_label
      || annonce.bien?.localisation_approx
      || annonce.espace_evenementiel?.localisation_approx
      || '';
}

export function getCategorieAnnonce(annonce: AnnonceListItem): string {
  if (annonce.type_bien_annonce === 'EVENEMENTIEL') {
    return annonce.espace_evenementiel?.type_espace_label ?? 'Événementiel';
  }
  return annonce.bien?.type_bien_categorie ?? '';
}