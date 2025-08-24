import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, of, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly API_URL = 'http://localhost:8000/login';
  private readonly isLoggedInSubject = new BehaviorSubject<boolean>(false);

  isLoggedIn$ = this.isLoggedInSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

login(username: string, password: string) {
  return this.http
    .post<{ access_token: string }>(this.API_URL, { username, password })
    .pipe(
      tap((res) => {
        // Si la respuesta tiene token, lo guardamos
        localStorage.setItem('token', res.access_token);
        this.isLoggedInSubject.next(true);
      }),
      catchError((err) => {
        this.isLoggedInSubject.next(false);

        // Tomamos el detalle del backend (FastAPI manda {"detail": "..."} )
        const message = err.error?.detail || 'Error en el inicio de sesión';

        // Re-lanzamos el error para que el componente lo capture
        return throwError(() => new Error(message));
      })
    );
}

  logout() {
    localStorage.removeItem('token');
    this.isLoggedInSubject.next(false);
    this.router.navigate(['/login']);
  }

  getToken() {
    return localStorage.getItem('token');
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  
}