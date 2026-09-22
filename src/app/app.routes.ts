import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { Home } from './features/home/home';
import { Cartelera } from './features/cartelera/cartelera';
import { authGuard } from './core/guards/auth.guard';
import { PeliculaDetalle } from './features/pelicula-detalle/pelicula-detalle';
import { Butacas } from './features/butacas/butacas';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'home', component: Home },           // público
  { path: 'cartelera', component: Cartelera },  // público
  { path: 'pelicula/:id', component: PeliculaDetalle },
  { path: 'funcion/:funcionId/butacas', component: Butacas },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
];