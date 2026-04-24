// Type de personne
export enum TypePersonne {
  PHYSIQUE = 'PHYSIQUE',
  MORALE = 'MORALE'
}

// Modèle de base pour l'inscription
export interface RegisterRequest {
  // Données User
  username?: string;
  phone?: string;
  password: string;
  confirm_password: string;
  secret_question: string;
  secret_answer: string;
  
  // Données Profil Personne
  type_personne: TypePersonne;
  nom: string;
  prenom?: string;
  sigle?: string;
  adresse?: string;
  email?: string;
  cin?: string;
  profession?: string;
  numero_registre?: string;
  preuve_legale?: File;
}

// Réponse du backend après inscription
export interface RegisterResponse {
  success: boolean;
  message: string;
  user: {
    id: number;
    username: string;
    phone: string;
    roles: string[];
    is_active: boolean;
  };
  profil: {
    id: string;
    nom: string;
    prenom?: string;
    nom_complet: string;
    type_personne: TypePersonne;
    cin?: string;
    iuc?: string; 
    numero_registre?: string;
    profession?: string;
    sigle?: string;
    adresse?: string;
    telephone?: string;
    email?: string;
    est_verifie: boolean;
    statut_verification: string;
    peut_etre_verifie: boolean;
    date_creation: string;
  };
}