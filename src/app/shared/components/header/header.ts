import {
  Component,
  effect,
  inject,
  signal
} from '@angular/core';
import {
  Router,
  RouterLink
} from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header {
  auth = inject(AuthService);

  private router = inject(Router);

  rol = signal<string | null>(null);

  constructor() {
    effect(() => {
      const usuario = this.auth.currentUser();

      if (!usuario) {
        this.rol.set(null);
        return;
      }

      void this.cargarRol(usuario.id);
    });
  }

  esAdmin() {
    return this.rol() === 'admin';
  }

  private async cargarRol(usuarioId: string) {
    const { data, error } =
      await this.auth.getPerfil(usuarioId);

    /*
    Evita guardar el rol si el usuario cerró sesión
    mientras se estaba realizando la consulta.
    */
    if (
      this.auth.currentUser()?.id !== usuarioId
    ) {
      return;
    }

    if (error || !data) {
      this.rol.set(null);
      return;
    }

    this.rol.set(data.rol);
  }

  async cerrarSesion() {
    const { error } = await this.auth.logout();

    if (error) {
      console.error(
        'No se pudo cerrar la sesión:',
        error.message
      );
      return;
    }

    this.rol.set(null);
    await this.router.navigate(['/home']);
  }
}