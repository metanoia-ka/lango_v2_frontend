import { Role } from "./role.model";

export interface User {
  id: string; // UUID est une chaîne en TypeScript
  username: string;
  phone?: string;
  roles: Role[]; // Les rôles sont des objets Role complets dans UserSerializer
  is_active: boolean;
  created_at: string;
  is_superuser: boolean;
  // Ajoute d'autres champs si ton serializer en expose (ex: updated_at)
  updated_at?: string;
}

// Interface pour les données utilisateur envoyées lors de la création 
// ou mise à jour (correspondant à RegisterSerializer)
export interface UserCreateUpdate {
  username: string;
  //phone?: string;
  password?: string; // Optionnel pour la mise à jour
  roles: string[]; // Les rôles sont envoyés par leur 'name' (slug_field)
  is_active?: boolean; // Optionnel, car non marqué comme requis
  is_superuser?: boolean; // Optionnel, car non marqué comme requis
}

export interface UserUpdateData {
  username?: string;
  phone?: string;
  roles?: string[];
  is_active?: boolean;
  password?: string;
  confirm_password?: string;
  secret_question?: string;
  secret_answer?: string;
}