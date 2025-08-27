import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { AuthUser } from './users.component';
import { UsersService } from '../../services/users.service';

// Con Angular 19 y versiones recientes, se usa una función de resolución en lugar de una clase
export const usersResolver: ResolveFn<AuthUser[]> = (route, state) => {
  return inject(UsersService).getUsers();
};