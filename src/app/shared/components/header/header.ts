import { Component, HostListener, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
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
  nombre = signal('');
  apellido = signal('');
  puntos = signal(0);

  panelAbierto = signal(false);

  constructor() {
    effect(() => {
      const usuario = this.auth.currentUser();

      if (!usuario) {
        this.limpiarPerfil();
        this.panelAbierto.set(false);
        return;
      }

      void this.cargarPerfil(usuario.id);
    });
  }

  esAdmin() {
    return this.rol() === 'admin';
  }

  esStaff() {
    return (
      this.rol() === 'empleado' ||
      this.rol() === 'admin'
    );
  }

  nombreUsuario() {
    const nombreCompleto = [
      this.nombre(),
      this.apellido()
    ]
      .filter(Boolean)
      .join(' ');

    if (nombreCompleto) {
      return nombreCompleto;
    }

    return 'Usuario';
  }

  cerrarPanel() {
    this.panelAbierto.set(false);
  }

  async alternarPanel() {
    const debeAbrirse =
      !this.panelAbierto();

    this.panelAbierto.set(debeAbrirse);

    if (!debeAbrirse) {
      return;
    }

    const usuario =
      this.auth.currentUser();

    if (usuario) {
      await this.cargarPerfil(usuario.id);
    }
  }

  @HostListener('document:keydown.escape')
  cerrarConEscape() {
    this.cerrarPanel();
  }

  private async cargarPerfil(
    usuarioId: string
  ) {
    const { data, error } =
      await this.auth.getPerfil(usuarioId);

    if (
      this.auth.currentUser()?.id !== usuarioId
    ) {
      return;
    }

    if (error || !data) {
      this.limpiarPerfil();
      return;
    }

    this.rol.set(data.rol);
    this.nombre.set(data.nombre ?? '');
    this.apellido.set(data.apellido ?? '');

    this.puntos.set(
      Number(data.puntos ?? 0)
    );
  }

  private limpiarPerfil() {
    this.rol.set(null);
    this.nombre.set('');
    this.apellido.set('');
    this.puntos.set(0);
  }

  async cerrarSesion() {
    const { error } =
      await this.auth.logout();

    if (error) {
      console.error(
        'No se pudo cerrar la sesión:',
        error.message
      );

      return;
    }

    this.limpiarPerfil();
    this.panelAbierto.set(false);

    await this.router.navigate(['/home']);
  }
}