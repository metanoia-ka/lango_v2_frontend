import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { environnement } from "../../../../environnements/environnement";
import { Observable } from "rxjs";
import {
   ConfirmImportPayload, 
   ImportConfirmResult, 
   ParseResult 
  } from "../models/lotissement-import.model";

@Injectable({ providedIn: 'root' })
export class LotissementImportService {

  private http   = inject(HttpClient);
  private base   = `${environnement.apiBaseUrl}/lotissements`;

  /**
   * Étape 1 — Envoyer le fichier pour extraction des bornes (preview).
   * Retourne les bornes sans créer de lotissement.
   */
  parserFichier(file: File): Observable<ParseResult> {
    const form = new FormData();
    form.append('fichier', file, file.name);
    return this.http.post<ParseResult>(
      `${this.base}/importer/parse/`,
      form,
      { withCredentials: true }
    );
  }

  /**
   * Étape 2 — Confirmer la création du lotissement avec les bornes.
   */
  confirmerImport(payload: ConfirmImportPayload): Observable<ImportConfirmResult> {
    return this.http.post<ImportConfirmResult>(
      `${this.base}/importer/confirmer/`,
      payload,
      { withCredentials: true }
    );
  }
}
