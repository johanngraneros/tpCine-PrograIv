import { Component, computed, effect, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { PeliculasService } from '../../core/services/peliculas.service';
import { AuthService } from '../../core/services/auth.service';
import { AlertasEstrenosService } from '../../core/services/alertas-estrenos.service';
import { calcularEdad, esPreventaActiva } from '../../core/utils/fecha.utils';

@Component({
  selector: 'app-pelicula-detalle',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './pelicula-detalle.html',
  styleUrl: './pelicula-detalle.css'
})
export class PeliculaDetalle implements OnInit {
  private route = inject(ActivatedRoute);
  private peliculasService = inject(PeliculasService);
  private formBuilder = inject(FormBuilder);
  private alertas = inject(AlertasEstrenosService);
  auth = inject(AuthService); // público, lo usamos desde el template

  peliculaId = '';
  pelicula = signal<any>(null);
  funciones = signal<any[]>([]);
  resenas = signal<any[]>([]);
  cargando = signal(true);
  perfilUsuario = signal<any>(null);
  cargandoPerfil = signal(false);

  restriccionEdad = computed(() => Number(this.pelicula()?.restriccion_edad ?? 0));
  fechaNacimientoUsuario = computed(() =>
    this.perfilUsuario()?.fecha_nacimiento ??
    this.auth.currentUser()?.user_metadata?.['fecha_nacimiento'] ??
    null
  );
  puedeResenar = computed(() => {
    const restriccion = this.restriccionEdad();
    if (restriccion <= 0) return true;

    const edad = calcularEdad(this.fechaNacimientoUsuario());
    return edad !== null && edad >= restriccion;
  });
  verificandoEdad = computed(() =>
    Boolean(
      this.auth.currentUser() &&
      this.restriccionEdad() > 0 &&
      !this.fechaNacimientoUsuario() &&
      this.cargandoPerfil()
    )
  );

  private cargarPerfilEffect = effect(() => {
    const usuario = this.auth.currentUser();
    if (!usuario) {
      this.perfilUsuario.set(null);
      return;
    }

    void this.cargarPerfilUsuario(usuario.id);
  });

  resenaForm = this.formBuilder.nonNullable.group({
    estrellas: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    comentario: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]]
  });
  enviandoResena = signal(false);
  errorResena = signal('');
  resenaEditandoId = signal<string | null>(null);
  mensajeResena = signal('');
  versionesDisponibles = computed(() => [
    ...new Set(this.funciones().map(funcion => `${funcion.formato} · ${funcion.idioma}`))
  ]);

  async ngOnInit() {
    this.peliculaId = this.route.snapshot.paramMap.get('id')!;
    await this.cargarTodo();
  }

  private async cargarTodo() {
    this.cargando.set(true);
    const [peliculaResult, funcionesResult, resenasResult] = await Promise.all([
      this.peliculasService.getPorId(this.peliculaId),
      this.peliculasService.getFuncionesDePelicula(this.peliculaId),
      this.peliculasService.getResenas(this.peliculaId)
    ]);

    if (peliculaResult.data) this.pelicula.set(peliculaResult.data);
    if (funcionesResult.data) this.funciones.set(funcionesResult.data);
    if (resenasResult.data) {
      this.resenas.set(resenasResult.data);
      this.prepararResenaDelUsuario(resenasResult.data);
    }

    if (resenasResult.error) {
      this.errorResena.set('No se pudieron cargar las reseñas. Intentá nuevamente.');
    }

    if (peliculaResult.data && funcionesResult.data) {
      this.alertas.notificarPreventasActivas(peliculaResult.data.titulo, funcionesResult.data);
    }

    this.cargando.set(false);
  }

  async enviarResena() {
  const usuario = this.auth.currentUser();

  if (!usuario) {
    this.errorResena.set(
      'Tenés que iniciar sesión para publicar una reseña.'
    );
    return;
  }

  if (!(await this.verificarEdadUsuario(usuario.id))) {
    this.errorResena.set(
      `No podés publicar una reseña porque esta película requiere tener al menos ${this.restriccionEdad()} años.`
    );
    return;
  }

  const { estrellas, comentario: comentarioIngresado } =
    this.resenaForm.getRawValue();
  const comentario = comentarioIngresado.trim();

  if (comentario.length === 0) {
    this.errorResena.set(
      'Escribí un comentario antes de publicar la reseña.'
    );
    return;
  }

  if (comentario.length < 5) {
    this.errorResena.set(
      'El comentario debe tener al menos 5 caracteres.'
    );
    return;
  }

  if (
    estrellas < 1 ||
    estrellas > 5
  ) {
    this.errorResena.set(
      'Seleccioná una puntuación entre 1 y 5 estrellas.'
    );
    return;
  }

  if (this.enviandoResena()) {
    return;
  }

  this.errorResena.set('');
  this.enviandoResena.set(true);

  const idExistente = this.resenaEditandoId();
  const { error } = idExistente
    ? await this.peliculasService.actualizarResena(idExistente, usuario.id, estrellas, comentario)
    : await this.peliculasService.crearResena(this.peliculaId, usuario.id, estrellas, comentario);

  this.enviandoResena.set(false);

  if (error) {
    if (error.code === '23505') {
      this.errorResena.set(
        'Ya publicaste una reseña para esta película.'
      );
      return;
    }

    this.errorResena.set(
      `No se pudo ${idExistente ? 'actualizar' : 'publicar'} la reseña. Intentá nuevamente.`
    );
    return;
  }

  await this.cargarTodo();
  this.mensajeResena.set(idExistente ? 'Reseña actualizada correctamente.' : 'Reseña publicada correctamente.');
  }


  editarResena(resena: any) {
    const usuario = this.auth.currentUser();
    if (!usuario || resena.usuario_id !== usuario.id || !this.puedeResenar()) return;
    this.resenaEditandoId.set(resena.id);
    this.resenaForm.setValue({ estrellas: Number(resena.estrellas), comentario: resena.comentario ?? '' });
    this.errorResena.set('');
    this.mensajeResena.set('');
  }

  preventaActiva(funcion: any) {
    return esPreventaActiva(funcion);
  }

  precioFuncion(funcion: any) {
    return this.preventaActiva(funcion) ? funcion.precio_preventa : funcion.precio;
  }

  autorResena(resena: any) {
    return [resena.perfiles?.nombre, resena.perfiles?.apellido]
      .filter(Boolean)
      .join(' ') || 'Usuario';
  }

  private prepararResenaDelUsuario(resenas: any[]) {
    const usuarioId = this.auth.currentUser()?.id;
    if (!usuarioId) return;
    const propia = resenas.find(resena => resena.usuario_id === usuarioId);
    if (propia) this.editarResena(propia);
  }

  private async cargarPerfilUsuario(usuarioId: string) {
    this.cargandoPerfil.set(true);
    const { data } = await this.auth.getPerfil(usuarioId);
    this.perfilUsuario.set(data ?? null);
    this.cargandoPerfil.set(false);
    this.prepararResenaDelUsuario(this.resenas());
  }

  private async verificarEdadUsuario(usuarioId: string): Promise<boolean> {
    if (this.restriccionEdad() <= 0) return true;

    if (!this.fechaNacimientoUsuario()) {
      await this.cargarPerfilUsuario(usuarioId);
    }

    const edad = calcularEdad(this.fechaNacimientoUsuario());
    return edad !== null && edad >= this.restriccionEdad();
  }
}
