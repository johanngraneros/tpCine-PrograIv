import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { staffGuard } from './core/guards/staff.guard';

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
    path: 'mis-entradas',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/mis-entradas/mis-entradas'
      ).then(component => component.MisEntradas)
  },
  {
    path: 'mis-compras',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/mis-compras/mis-compras'
      ).then(component => component.MisCompras)
  },
  {
    path: 'beneficios',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/beneficios/beneficios'
      ).then(component => component.Beneficios)
  },
  {
    path: 'control-acceso',
    canActivate: [authGuard, staffGuard],
    loadComponent: () =>
      import(
        './features/control-acceso/control-acceso'
      ).then(component => component.ControlAcceso)
  },
  {
    path: 'control-canjes',
    canActivate: [authGuard, staffGuard],
    loadComponent: () =>
      import(
        './features/control-canjes/control-canjes'
      ).then(component => component.ControlCanjes)
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
    path: 'admin/compras',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import(
        './features/admin/compras-admin/compras-admin'
      ).then(component => component.ComprasAdmin)
  },
  {
    path: 'admin/entradas',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import(
        './features/admin/entradas-admin/entradas-admin'
      ).then(component => component.EntradasAdmin)
  },
  {
    path: 'admin/productos',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import(
        './features/admin/productos-admin/productos-admin'
      ).then(component => component.ProductosAdmin)
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