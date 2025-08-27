import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthUser } from '../components/users/users.component'; // Importa la interfaz

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://127.0.0.1:8000/users';

  getUsers(): Observable<AuthUser[]> {
    return this.http.get<AuthUser[]>(this.apiUrl);
  }
}