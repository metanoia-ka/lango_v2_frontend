import { PersonnePhysique } from "./personne-mini.model";

export type TypePersonne = 'PHYSIQUE' | 'MORALE';

export interface Personne {
  id: string; // Correction ici : l'ID doit être un string
  nom: string;
  prenom?: string;
  type_personne: TypePersonne;
  cin?: string;
  iuc?: string;
  numero_registre?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  representant?: PersonnePhysique | string;
}

export interface PersonResponse {
  id: string; // Correction ici : l'ID doit être un string
  nom: string;
  prenom?: string;
  type_personne: TypePersonne;
  user?: string;
  cin?: string;
  iuc?: string; 
  numero_registre?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  representant?: PersonnePhysique | string;
}