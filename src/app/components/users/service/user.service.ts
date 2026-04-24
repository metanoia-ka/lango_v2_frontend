import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { environnement } from '../../../../environnements/environnement';
import { User, UserCreateUpdate, UserUpdateData } from '../../../models/user.model';
import { UserMinimal } from '../../../models/role.model';
@Injectable({
  providedIn: 'root'
})
export class UserService {
  
  private http = inject(HttpClient);
  private endpoint = `${environnement.apiBaseUrl}/users/`;
  private userSubject = new BehaviorSubject<User[]>([]);
  user$ = this.userSubject.asObservable();

  /**
  * Charge les utilisateurs depuis le backend.
  * Ajoute un paramètre de requête pour contourner le cache du navigateur.
  */
  fetchUsers(): void {
    const url = `${this.endpoint}`;
    this.http.get<User[]>(url, { withCredentials: true }).subscribe({
      next: users => this.userSubject.next(users)
    });
  }

  getUsers(): Observable<User[]> {
    const url = `${this.endpoint}`;
    return this.http.get<User[]>(url, { withCredentials: true }).pipe(
      tap(users => this.userSubject.next(users)),
      catchError(err => {
        return throwError(() => err);
      })
    );
  }

  get currentUsers(): User[] {
    return this.userSubject.getValue();
  }

  /**
  * Récupère un rôle par son ID.
  * Ajoute un paramètre de requête pour contourner le cache.
  */
  getUserById(id: string): Observable<User> {
    const url = `${this.endpoint}${id}/`;
    return this.http.get<User>(url, { withCredentials: true });
  }

   createUser( userData: Partial<UserCreateUpdate>): Observable<User> {
    return this.http.post<User>(this.endpoint, userData, { withCredentials: true }).pipe(
       tap(newUser => {
        const updated = [...this.currentUsers, newUser];
        this.userSubject.next(updated);
      }),
      catchError(err => {
        return throwError(() => err)
      })
    );
  }

  updateUser(id: string, user: Partial<UserUpdateData>): Observable<User> {
    return this.http.put<User>(
      `${this.endpoint}${id}/`, user, { withCredentials: true }
    ).pipe(
      tap(updatedUser => {
        const updated = this.currentUsers.map(r => r.id === id ? updatedUser : r);
        this.userSubject.next(updated);
      }),
      catchError(err => {
        return throwError(() => err)
      })
    );
  }

  partialUpdateUser(id: string, userData: Partial<UserUpdateData>): Observable<User> {
    return this.http.patch<User>(
      `${this.endpoint}/${id}/`, userData, { withCredentials: true }
    ).pipe(
      catchError(err => {
        return throwError(() => err)
      })
    );
  }

  activateUser(id: string): Observable<User> {
    return this.partialUpdateUser(id, { is_active: true });
  }

  deactivateUser(id: string): Observable<User> {
    return this.partialUpdateUser(id, { is_active: false });
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.endpoint}${id}/`, { withCredentials: true }
    ).pipe(
      tap(() => {
        const updated = this.currentUsers.filter(r => r.id !== id);
        this.userSubject.next(updated);
      }),
      catchError(err => {
        return throwError(() => err)
      })
    );
  }

  getRoleUser(id: string) {
    return this.http.get<UserMinimal[]>(`${this.endpoint}${id}/roles`);
  }
}
