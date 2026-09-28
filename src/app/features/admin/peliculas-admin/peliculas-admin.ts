import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminPeliculasService } from '../../../core/services/admin-peliculas.service';
import type {
  Genero,
  PeliculaAdmin,
  PeliculaFormulario
} from '../../../core/models/pelicula.interface';

@Component({
  selector: 'app-peliculas-admin',
  imports: [
    FormsModule,
    RouterLink
  ],
  templateUrl: './peliculas-admin.html',
  styleUrl: './peliculas-admin.css'
})
export class PeliculasAdmin implements OnInit {
  private adminPeliculas =
    inject(AdminPeliculasService);

  peliculas = signal<PeliculaAdmin[]>([]);
  generos = signal<Genero[]>([]);

  cargando = signal(true);
  guardando = signal(false);

  mensajeError = signal('');
  mensajeExito = signal('');

  peliculaEditandoId =
    signal<string | null>(null);

  generosSeleccionados =
    signal<Set<string>>(new Set());

  formulario: PeliculaFormulario =
    this.crearFormularioVacio();

  async ngOnInit() {
    await this.cargarDatos();
  }

  private crearFormularioVacio():
    PeliculaFormulario {
    return {
      titulo: '',
      sinopsis: '',
      duracion_min: 90,
      imagen_url: '',
      restriccion_edad: null,
      activa: true
    };
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
    if (!this.formulario.titulo.trim()) {
      return 'El título es obligatorio.';
    }

    if (
      !Number.isInteger(
        this.formulario.duracion_min
      ) ||
      this.formulario.duracion_min <= 0
    ) {
      return 'La duración debe ser mayor a cero.';
    }

    if (
      this.formulario.restriccion_edad !==
        null &&
      this.formulario.restriccion_edad !==
        13 &&
      this.formulario.restriccion_edad !==
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

    const peliculaId =
      this.peliculaEditandoId();

    let resultado;

    if (peliculaId) {
      resultado =
        await this.adminPeliculas
          .actualizarPelicula(
            peliculaId,
            this.formulario,
            generoIds
          );
    } else {
      resultado =
        await this.adminPeliculas
          .crearPelicula(
            this.formulario,
            generoIds
          );
    }

    this.guardando.set(false);

    if (resultado.error) {
      this.mensajeError.set(
        resultado.error.message
      );
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

    this.formulario = {
      titulo: pelicula.titulo,
      sinopsis: pelicula.sinopsis ?? '',
      duracion_min:
        pelicula.duracion_min,
      imagen_url:
        pelicula.imagen_url ?? '',
      restriccion_edad:
        pelicula.restriccion_edad,
      activa: pelicula.activa
    };

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

    this.formulario =
      this.crearFormularioVacio();

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
      this.mensajeError.set(
        error.message
      );
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
    const confirmar = window.confirm(
      `¿Eliminar definitivamente "${pelicula.titulo}"?`
    );

    if (!confirmar) {
      return;
    }

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