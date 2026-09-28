import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn =
  async () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    while (!authService.sesionLista()) {
      await new Promise(resolve =>
        setTimeout(resolve, 20)
      );
    }

    const usuario = authService.currentUser();

    if (!usuario) {
      return router.createUrlTree(['/login']);
    }

    const { data: perfil, error } =
      await authService.getPerfil(usuario.id);

    if (error || !perfil) {
      return router.createUrlTree(['/home']);
    }

    if (perfil.rol !== 'admin') {
      return router.createUrlTree(['/home']);
    }

    return true;
  };