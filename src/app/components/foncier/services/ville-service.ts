import { inject, Injectable, signal } from "@angular/core";
import { environnement } from "../../../../environnements/environnement";
import { HttpClient } from "@angular/common/http";
import { ArrondissementVille, VilleAvecArrondissements } from "../models/ville.model";
import { Observable, tap } from "rxjs";

@Injectable({ providedIn: 'root' })
export class VilleService {
  private http = inject(HttpClient);
  private base = `${environnement.apiBaseUrl}/villes-avec-arrondissements`;

  // Signal partagé — chargé une fois, réutilisé partout
  villesAvecArrondissements = signal<VilleAvecArrondissements[]>([]);
  isLoaded                  = signal(false);

  /**
   * Charge les villes si pas encore chargées (lazy singleton).
   * AnnonceSearchModal et AnnonceFilter appelleront cette méthode.
   */
  chargerSiNecessaire(): Observable<VilleAvecArrondissements[]> {
    return this.http.get<VilleAvecArrondissements[]>(
      `${this.base}/`, { withCredentials: true }
    ).pipe(
      tap(data => {
        this.villesAvecArrondissements.set(data);
        this.isLoaded.set(true);
      })
    );
  }

  /** Retourne les arrondissements d'une ville donnée. */
  arrondissementsDe(ville: string): ArrondissementVille[] {
    return this.villesAvecArrondissements()
      .find(v => v.ville === ville)
      ?.arrondissements ?? [];
  }

  /** Noms de villes pour le sélecteur. */
  get nomVilles(): string[] {
    return this.villesAvecArrondissements().map(v => v.ville);
  }

  /**
   * Cherche les quartiers d'un arrondissement dans quartiers_connus.
   * Utilisé pour l'affichage du hint de recherche.
   */
  quartiersDeArrondissement(arrId: string): string[] {
    for (const v of this.villesAvecArrondissements()) {
      const arr = v.arrondissements.find(a => a.id === arrId);
      if (arr && arr.quartiers_connus) {
        return arr.quartiers_connus.split(',').map(q => q.trim()).filter(Boolean);
      }
    }
    return [];
  }
}