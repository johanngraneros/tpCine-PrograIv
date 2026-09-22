import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Esperamos a que termine el chequeo inicial de sesión
  while (!authService.sesionLista()) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  const user = authService.currentUser();

  if (user) {
    return true;
  }

  return router.createUrlTree(['/login']);
};