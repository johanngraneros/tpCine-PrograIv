import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminPeliculasService } from '../../../core/services/admin-peliculas.service';
import { traducirError } from '../../../core/services/supabase.service';
import type {
  Genero,
  PeliculaAdmin,
  PeliculaFormulario
} from '../../../core/models/pelicula.interface';
import { convertirFechaAISO, enmascararFecha, fechaParaMostrar } from '../../../core/utils/fecha.utils';

@Component({
  selector: 'app-peliculas-admin',
  imports: [
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './peliculas-admin.html',
  styleUrl: './peliculas-admin.css'
})
export class PeliculasAdmin implements OnInit {
  private adminPeliculas =
    inject(AdminPeliculasService);
  private formBuilder = inject(FormBuilder);

  peliculas = signal<PeliculaAdmin[]>([]);
  generos = signal<Genero[]>([]);

  cargando = signal(true);
  guardando = signal(false);

  mensajeError = signal('');
  confirmandoEliminacionId = signal<string | null>(null);
  mensajeExito = signal('');

  peliculaEditandoId =
    signal<string | null>(null);

  generosSeleccionados =
    signal<Set<string>>(new Set());

  formulario = this.formBuilder.group({
    titulo: ['', [
      Validators.required,
      Validators.maxLength(120)
    ]],
    sinopsis: ['', Validators.maxLength(1000)],
    duracion_min: [90, [
      Validators.required,
      Validators.min(1),
      Validators.max(600)
    ]],
    imagen_url: ['', [
      Validators.maxLength(500),
      Validators.pattern(/^$|https?:\/\/.+/i)
    ]],
    restriccion_edad: this.formBuilder.control<number | null>(null),
    fecha_estreno: ['', (control: AbstractControl) => convertirFechaAISO(control.value ?? '', true) === null ? { fechaInvalida: true } : null],
    activa: [true]
  });

  async ngOnInit() {
    await this.cargarDatos();
  }

  aplicarMascaraFechaEstreno() {
    const control = this.formulario.controls.fecha_estreno;
    control.setValue(enmascararFecha(String(control.value ?? '')), { emitEvent: false });
  }

  async cargarDatos() {
    this.cargando.set(true);
    this.mensajeError.set('');

    const [
      peliculasResult,
      generosResult
    ] = await Promise.all([
      this.adminPeliculas.obtenerPeliculas(),
      this.adminPeliculas.obtenerGeneros()
    ]);

    if (peliculasResult.error) {
      this.mensajeError.set(
        'No se pudieron cargar las películas.'
      );
    } else {
      const peliculas =
        peliculasResult.data ?? [];

      this.peliculas.set(peliculas);
    }

    if (generosResult.error) {
      this.mensajeError.set(
        'No se pudieron cargar los géneros.'
      );
    } else {
      const generos =
        generosResult.data ?? [];

      this.generos.set(generos);
    }

    this.cargando.set(false);
  }

  alternarGenero(generoId: string) {
    const seleccionados = new Set(
      this.generosSeleccionados()
    );

    if (seleccionados.has(generoId)) {
      seleccionados.delete(generoId);
    } else {
      seleccionados.add(generoId);
    }

    this.generosSeleccionados.set(
      seleccionados
    );
  }

  generoSeleccionado(generoId: string) {
    return this
      .generosSeleccionados()
      .has(generoId);
  }

  validarFormulario(): string {
    const formulario = this.formulario.getRawValue();

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
    }

    if (!formulario.titulo?.trim()) {
      return 'El título es obligatorio.';
    }

    if (this.formulario.controls.titulo.hasError('maxlength')) {
      return 'El título no puede superar los 120 caracteres.';
    }

    const duracion = this.formulario.controls.duracion_min;

    if (duracion.hasError('required')) {
      return 'La duración es obligatoria.';
    }

    if (duracion.hasError('min')) {
      return 'La duración debe ser mayor a 0 minutos.';
    }

    if (duracion.hasError('max')) {
      return 'La duración no puede superar los 600 minutos.';
    }

    if (this.formulario.controls.fecha_estreno.invalid) {
      return 'Ingresá una fecha de estreno válida.';
    }

    const imagen = this.formulario.controls.imagen_url;

    if (imagen.hasError('pattern')) {
      return 'La URL de la imagen debe comenzar con http:// o https://.';
    }

    if (imagen.hasError('maxlength')) {
      return 'La URL de la imagen no puede superar los 500 caracteres.';
    }

    if (this.formulario.controls.sinopsis.hasError('maxlength')) {
      return 'La sinopsis no puede superar los 1000 caracteres.';
    }

    if (this.formulario.invalid) {
      return 'Revisá los datos ingresados en el formulario.';
    }

    if (
      formulario.restriccion_edad !==
        null &&
      formulario.restriccion_edad !==
        13 &&
      formulario.restriccion_edad !==
        18
    ) {
      return 'La restricción debe ser 13, 18 o sin restricción.';
    }

    if (
      this.generosSeleccionados().size === 0
    ) {
      return 'Seleccioná al menos un género.';
    }

    return '';
  }

  async guardar() {
    if (this.guardando()) {
      return;
    }

    this.mensajeError.set('');
    this.mensajeExito.set('');

    const validacion =
      this.validarFormulario();

    if (validacion) {
      this.mensajeError.set(validacion);
      return;
    }

    this.guardando.set(true);

    const generoIds = Array.from(
      this.generosSeleccionados()
    );
    const datosFormulario = this.formulario.getRawValue();
    const datos = {
      ...datosFormulario,
      fecha_estreno: convertirFechaAISO(datosFormulario.fecha_estreno ?? '', true) ?? ''
    } as PeliculaFormulario;

    const peliculaId =
      this.peliculaEditandoId();

    let resultado;

    if (peliculaId) {
      resultado =
        await this.adminPeliculas
          .actualizarPelicula(
            peliculaId,
            datos,
            generoIds
          );
    } else {
      resultado =
        await this.adminPeliculas
          .crearPelicula(
            datos,
            generoIds
          );
    }

    this.guardando.set(false);

    if (resultado.error) {
      this.mensajeError.set(traducirError(resultado.error, 'No se pudo guardar la película. Intentá nuevamente.'));
      return;
    }

    if (peliculaId) {
      this.mensajeExito.set(
        'Película actualizada correctamente.'
      );
    } else {
      this.mensajeExito.set(
        'Película creada correctamente.'
      );
    }

    this.cancelarEdicion();
    await this.cargarDatos();
  }

  editar(pelicula: PeliculaAdmin) {
    this.peliculaEditandoId.set(
      pelicula.id
    );

    this.formulario.reset({
      titulo: pelicula.titulo,
      sinopsis: pelicula.sinopsis ?? '',
      duracion_min:
        pelicula.duracion_min,
      imagen_url:
        pelicula.imagen_url ?? '',
      restriccion_edad:
        pelicula.restriccion_edad,
      fecha_estreno: fechaParaMostrar(pelicula.fecha_estreno),
      activa: pelicula.activa
    });

    const generoIds =
      pelicula.pelicula_generos.map(
        relacion => relacion.genero_id
      );

    this.generosSeleccionados.set(
      new Set(generoIds)
    );

    this.mensajeError.set('');
    this.mensajeExito.set('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  cancelarEdicion() {
    this.peliculaEditandoId.set(null);

    this.formulario.reset({
      titulo: '',
      sinopsis: '',
      duracion_min: 90,
      imagen_url: '',
      restriccion_edad: null,
      fecha_estreno: '',
      activa: true
    });

    this.generosSeleccionados.set(
      new Set()
    );
  }

  async cambiarEstado(
    pelicula: PeliculaAdmin
  ) {
    this.mensajeError.set('');
    this.mensajeExito.set('');

    const { error } =
      await this.adminPeliculas
        .cambiarEstado(
          pelicula.id,
          !pelicula.activa
        );

    if (error) {
      this.mensajeError.set(traducirError(error, 'No se pudo eliminar la película. Intentá nuevamente.'));
      return;
    }

    this.mensajeExito.set(
      pelicula.activa
        ? 'Película desactivada.'
        : 'Película activada.'
    );

    await this.cargarDatos();
  }

  async eliminar(
    pelicula: PeliculaAdmin
  ) {
    if (this.confirmandoEliminacionId() !== pelicula.id) {
      this.confirmandoEliminacionId.set(pelicula.id);
      return;
    }
    this.confirmandoEliminacionId.set(null);

    this.mensajeError.set('');
    this.mensajeExito.set('');

    const { error } =
      await this.adminPeliculas
        .eliminarPelicula(pelicula.id);

    if (error) {
      this.mensajeError.set(
        'No se puede eliminar la película. ' +
        'Puede tener funciones relacionadas.'
      );
      return;
    }

    this.mensajeExito.set(
      'Película eliminada correctamente.'
    );

    if (
      this.peliculaEditandoId() ===
      pelicula.id
    ) {
      this.cancelarEdicion();
    }

    await this.cargarDatos();
  }
}
