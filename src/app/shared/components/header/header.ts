import { Component, HostListener, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { traducirError } from '../../../core/services/supabase.service';
import { AlertasEstrenosService } from '../../../core/services/alertas-estrenos.service';

interface NotificacionCine {
  id: string;
  titulo: string;
  mensaje: string;
  pelicula_id: string;
  leida: boolean;
}

@Component({
  selector: 'app-header',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header {
  auth = inject(AuthService);

  private router = inject(Router);
  private formBuilder = inject(FormBuilder);
  private alertasService = inject(AlertasEstrenosService);

  rol = signal<string | null>(null);
  nombre = signal('');
  apellido = signal('');
  puntos = signal(0);

  panelAbierto = signal(false);
  panelNotificacionesAbierto = signal(false);
  notificaciones = signal<NotificacionCine[]>([]);
  cargandoNotificaciones = signal(false);
  notificacionesSinLeer = () => this.notificaciones().filter(notificacion => !notificacion.leida).length;
  editandoPerfil = signal(false);
  guardandoPerfil = signal(false);
  mensajePerfil = signal('');
  errorPerfil = signal('');
  perfilForm = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(60)]],
    apellido: ['', [Validators.required, Validators.maxLength(60)]]
  });

  constructor() {
    effect(() => {
      const usuario = this.auth.currentUser();

      if (!usuario) {
        this.limpiarPerfil();
        this.panelAbierto.set(false);
        return;
      }

      void this.cargarPerfil(usuario.id);
      void this.actualizarNotificaciones(usuario.id);
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
    this.panelNotificacionesAbierto.set(false);

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
    this.panelNotificacionesAbierto.set(false);
  }

  async alternarNotificaciones() {
    const debeAbrirse = !this.panelNotificacionesAbierto();
    this.panelNotificacionesAbierto.set(debeAbrirse);
    this.panelAbierto.set(false);
    const usuario = this.auth.currentUser();
    if (debeAbrirse && usuario) await this.cargarNotificaciones(usuario.id);
  }

  async marcarNotificacionesLeidas() {
    const usuario = this.auth.currentUser();
    if (!usuario) return;
    const ids = this.notificaciones().filter(item => !item.leida).map(item => item.id);
    this.notificaciones.update(items => items.map(item => ({ ...item, leida: true })));
    await this.alertasService.marcarComoLeidas(usuario.id, ids);
  }

  private async cargarNotificaciones(usuarioId: string) {
    this.cargandoNotificaciones.set(true);
    const { data, error } = await this.alertasService.obtenerNotificaciones(usuarioId);
    if (!error && this.auth.currentUser()?.id === usuarioId) {
      this.notificaciones.set((data ?? []) as NotificacionCine[]);
    }
    this.cargandoNotificaciones.set(false);
  }

  private async actualizarNotificaciones(usuarioId: string) {
    const { error } = await this.alertasService.sincronizarNotificacionesPreventa(usuarioId);
    if (error) {
      this.errorPerfil.set(traducirError(error, 'No se pudieron actualizar las notificaciones.'));
    }
    await this.cargarNotificaciones(usuarioId);
    await this.alertasService.mostrarNotificacionesPendientes(usuarioId);
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
    this.perfilForm.setValue({ nombre: data.nombre ?? '', apellido: data.apellido ?? '' });

    this.puntos.set(
      Number(data.puntos ?? 0)
    );
  }

  private limpiarPerfil() {
    this.rol.set(null);
    this.nombre.set('');
    this.apellido.set('');
    this.puntos.set(0);
    this.editandoPerfil.set(false);
    this.mensajePerfil.set('');
    this.errorPerfil.set('');
    this.notificaciones.set([]);
    this.panelNotificacionesAbierto.set(false);
  }

  comenzarEdicionPerfil() {
    this.perfilForm.setValue({ nombre: this.nombre(), apellido: this.apellido() });
    this.editandoPerfil.set(true);
    this.mensajePerfil.set('');
    this.errorPerfil.set('');
  }

  cancelarEdicionPerfil() {
    this.editandoPerfil.set(false);
    this.errorPerfil.set('');
  }

  async guardarPerfil() {
    const usuario = this.auth.currentUser();
    if (!usuario || this.perfilForm.invalid || this.guardandoPerfil()) {
      this.perfilForm.markAllAsTouched();
      return;
    }

    const { nombre, apellido } = this.perfilForm.getRawValue();
    this.guardandoPerfil.set(true);
    this.errorPerfil.set('');
    const { data, error } = await this.auth.actualizarNombre(usuario.id, nombre.trim(), apellido.trim());
    this.guardandoPerfil.set(false);

    if (error || !data) {
      this.errorPerfil.set(traducirError(error, 'No se pudo actualizar el nombre. Intentá nuevamente.'));
      return;
    }

    this.nombre.set(data.nombre ?? nombre.trim());
    this.apellido.set(data.apellido ?? apellido.trim());
    this.editandoPerfil.set(false);
    this.mensajePerfil.set('Nombre actualizado correctamente.');
  }

  async cerrarSesion() {
    const { error } =
      await this.auth.logout();

    if (error) {
      console.error('No se pudo cerrar la sesión:', traducirError(error));

      return;
    }

    this.limpiarPerfil();
    this.panelAbierto.set(false);

    await this.router.navigate(['/home']);
  }
}
