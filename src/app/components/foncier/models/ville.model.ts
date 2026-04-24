export interface ArrondissementVille {
  id:               string;
  nom:              string;
  slug:             string;
  quartiers_connus: string;      // CSV brut : "Essos, Ngousso, Biyem-Assi"
  quartiers_apercu: string;      // max 3 quartiers pour l'affichage
}

export interface VilleAvecArrondissements {
  ville:            string;      // ville_reference : "Yaoundé", "Douala"…
  arrondissements:  ArrondissementVille[];
}