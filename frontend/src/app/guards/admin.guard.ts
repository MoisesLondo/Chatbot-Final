import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const AdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.getUserData();
  if (user && (user.role === 'admin' || user.role === 'superusuario')) {
    return true;
  }
  router.navigate(['/']);
  return false;
};
