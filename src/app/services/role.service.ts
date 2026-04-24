import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environnement } from '../../environnements/environnement';
import { Role, UserMinimal } from '../models/role.model';
import { BehaviorSubject, catchError, Observable, of, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RoleService {

  private http = inject(HttpClient);
  private endpoint = `${environnement.apiBaseUrl}/roles/`;
  private roleSubject = new BehaviorSubject<Role[]>([]);
  role$ = this.roleSubject.asObservable();

  /**
   * Charge les rôles depuis le backend.
   * Ajoute un paramètre de requête pour contourner le cache du navigateur.
   */
  fetchRoles(): void {
    // Ajout d'un "cache buster" pour forcer le rechargement
    const url = `${this.endpoint}`;
    this.http.get<Role[]>(url, { withCredentials: true }).subscribe({
      next: roles => this.roleSubject.next(roles)
    });
  }

  getRoles(): Observable<Role[]> {
    const url = `${this.endpoint}`;
    return this.http.get<Role[]>(url, { withCredentials: true }).pipe(
      tap(roles => this.roleSubject.next(roles)),
      catchError((err) => {
        return throwError(() => err);
      })
    );
  }

  get currentRoles(): Role[] {
    return this.roleSubject.getValue();
  }

  /**
   * Récupère un rôle par son ID.
   * Ajoute un paramètre de requête pour contourner le cache.
   */
  getRoleById(id: string): Observable<Role> {
    const url = `${this.endpoint}${id}/`;
    return this.http.get<Role>(url, { withCredentials: true });
  }

  createRole(role: Omit<Role, 'id'>): Observable<Role> {

    
    return this.http.post<Role>(this.endpoint, role, { withCredentials: true }).pipe(
      tap(newRole => {
        const updated = [...this.currentRoles, newRole];
        this.roleSubject.next(updated);
      }),
      catchError(err => {
        return throwError(() => err)
      })
    );
  }

  updateRole(id: string, role: Partial<Role>): Observable<Role> {
    return this.http.put<Role>(
      `${this.endpoint}${id}/`, role, { withCredentials: true }
    ).pipe(
      tap(updatedRole => {
        const updated = this.currentRoles.map(r => r.id === id ? updatedRole : r);
        this.roleSubject.next(updated);
      }),
      catchError(err => {
        return throwError(() => err)
      })
    );
  }

  deleteRole(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.endpoint}${id}/`, { withCredentials: true }
    ).pipe(
      tap(() => {
        const updated = this.currentRoles.filter(r => r.id !== id);
        this.roleSubject.next(updated);
      }),
      catchError(err => {
        return throwError(() => err)
      })
    );
  }

  getRoleUser(id: string) {
    return this.http.get<UserMinimal[]>(
      `${this.endpoint}${id}/users/`, { withCredentials: true }
    );
  }
}
