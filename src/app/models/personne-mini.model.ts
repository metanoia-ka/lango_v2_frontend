/**
 * Interface de base pour une personne.
 * Contient les propriétés communes à une personne physique et morale.
 */
export interface Personne {
  id: string;
  nom: string;
  prenom?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  type_personne: 'PHYSIQUE' | 'MORALE';
}

/**
 * Interface pour une personne physique.
 * Étend l'interface de base Personne et ajoute une propriété spécifique 'cin'.
 */
export interface PersonnePhysique {
    id: string; // L'ID doit être un string pour l'UUID
    nom: string;
    prenom: string;
    cin?: string; // J'ai rendu le CIN optionnel car il peut ne pas exister dans certains cas
}

export interface PersonneMorale {
    id: string; // L'ID doit être un string
    nom: string;
    numero_registre?: string;
    representant: PersonnePhysique; // Le représentant est bien une PersonnePhysique
}