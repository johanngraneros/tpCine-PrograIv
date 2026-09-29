import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login')
        .then(component => component.Login)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register')
        .then(component => component.Register)
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./features/home/home')
        .then(component => component.Home)
  },
  {
    path: 'cartelera',
    loadComponent: () =>
      import('./features/cartelera/cartelera')
        .then(component => component.Cartelera)
  },
  {
    path: 'pelicula/:id',
    loadComponent: () =>
      import(
        './features/pelicula-detalle/pelicula-detalle'
      ).then(component => component.PeliculaDetalle)
  },
  {
    path: 'funcion/:funcionId/butacas',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/butacas/butacas')
        .then(component => component.Butacas)
  },
  {
    path: 'compra/:funcionId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/compra/compra')
        .then(component => component.Compra)
  },
  {
    path: 'admin/peliculas',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import(
        './features/admin/peliculas-admin/peliculas-admin'
      ).then(component => component.PeliculasAdmin)
  },
  {
    path: 'admin/funciones',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import(
        './features/admin/funciones-admin/funciones-admin'
      ).then(component => component.FuncionesAdmin)
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import(
        './features/admin/dashboard/dashboard'
      ).then(component => component.Dashboard)
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];