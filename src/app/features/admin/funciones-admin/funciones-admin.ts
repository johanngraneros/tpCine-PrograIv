import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  AdminFuncionesService
} from '../../../core/services/admin-funciones.service';

import type {
  FuncionAdmin,
  FuncionFormulario,
  PeliculaFuncionAdmin
} from '../../../core/models/funcion-admin.interface';

@Component({
  selector: 'app-funciones-admin',
  imports: [
    FormsModule,
    RouterLink
  ],
  templateUrl: './funciones-admin.html',
  styleUrl: './funciones-admin.css'
})
export class FuncionesAdmin implements OnInit {
  private adminFunciones =
    inject(AdminFuncionesService);

  funciones = signal<FuncionAdmin[]>([]);

  peliculas =
    signal<PeliculaFuncionAdmin[]>([]);

  cargando = signal(true);
  guardando = signal(false);

  mensajeError = signal('');
  mensajeExito = signal('');

  funcionEditandoId =
    signal<string | null>(null);

  formulario: FuncionFormulario =
    this.crearFormularioVacio();

  async ngOnInit() {
    await this.cargarDatos();
  }

  private crearFormularioVacio():
    FuncionFormulario {
    return {
      pelicula_id: '',
      fecha_hora: '',
      duracion_min: 90,
      formato: '2D',
      idioma: 'castellano',
      precio: 0,
      precio_vip: null,
      precio_preventa: null,
      fecha_fin_preventa: null
    };
  }

  async cargarDatos() {
    this.cargando.set(true);
    this.mensajeError.set('');

    const [
      funcionesResult,
      peliculasResult
    ] = await Promise.all([
      this.adminFunciones.obtenerFunciones(),
      this.adminFunciones
        .obtenerPeliculasActivas()
    ]);

    if (funcionesResult.error) {
      this.mensajeError.set(
        'No se pudieron cargar las funciones.'
      );
    } else {
      this.funciones.set(
      (funcionesResult.data ?? []) as FuncionAdmin[]
        );  
    }

    if (peliculasResult.error) {
      this.mensajeError.set(
        'No se pudieron cargar las películas.'
      );
    } else {
      this.peliculas.set(
        peliculasResult.data ?? []
      );
    }

    this.cargando.set(false);
  }

  seleccionarPelicula() {
    const pelicula = this.peliculas().find(
      item =>
        item.id ===
        this.formulario.pelicula_id
    );

    if (pelicula) {
      this.formulario.duracion_min =
        pelicula.duracion_min;
    }
  }

  validarFormulario(): string {
    if (!this.formulario.pelicula_id) {
      return 'Seleccioná una película.';
    }

    if (!this.formulario.fecha_hora) {
      return 'Seleccioná la fecha y el horario.';
    }

    const fechaFuncion = new Date(
      this.formulario.fecha_hora
    );

    if (
      Number.isNaN(fechaFuncion.getTime())
    ) {
      return 'La fecha de la función no es válida.';
    }

    if (fechaFuncion <= new Date()) {
      return 'La función debe programarse para una fecha futura.';
    }

    if (
      !Number.isInteger(
        this.formulario.duracion_min
      ) ||
      this.formulario.duracion_min <= 0
    ) {
      return 'La duración debe ser mayor a cero.';
    }

    if (this.formulario.precio < 0) {
      return 'El precio no puede ser negativo.';
    }

    if (
      this.formulario.precio_vip !== null &&
      this.formulario.precio_vip < 0
    ) {
      return 'El precio VIP no puede ser negativo.';
    }

    const tienePrecioPreventa =
      this.formulario.precio_preventa !== null;

    const tieneFechaPreventa =
      Boolean(
        this.formulario.fecha_fin_preventa
      );

    if (
      tienePrecioPreventa !==
      tieneFechaPreventa
    ) {
      return 'Completá juntos el precio y el final de la preventa.';
    }

    if (
      this.formulario.precio_preventa !==
        null &&
      this.formulario.precio_preventa < 0
    ) {
      return 'El precio de preventa no puede ser negativo.';
    }

    if (
      this.formulario.fecha_fin_preventa
    ) {
      const finPreventa = new Date(
        this.formulario.fecha_fin_preventa
      );

      if (finPreventa >= fechaFuncion) {
        return 'La preventa debe finalizar antes de la función.';
      }
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

    const funcionId =
      this.funcionEditandoId();

    const resultado = funcionId
      ? await this.adminFunciones
          .actualizarFuncion(
            funcionId,
            this.formulario
          )
      : await this.adminFunciones
          .crearFuncion(this.formulario);

    this.guardando.set(false);

    if (resultado.error) {
      this.mensajeError.set(
        resultado.error.message
      );
      return;
    }

    this.mensajeExito.set(
      funcionId
        ? 'Función actualizada correctamente.'
        : 'Función creada y sala asignada correctamente.'
    );

    this.cancelarEdicion();
    await this.cargarDatos();
  }

  editar(funcion: FuncionAdmin) {
    this.funcionEditandoId.set(
      funcion.id
    );

    this.formulario = {
      pelicula_id:
        funcion.pelicula_id,

      fecha_hora:
        this.convertirAFechaLocal(
          funcion.fecha_hora
        ),

      duracion_min:
        funcion.duracion_min,

      formato:
        funcion.formato,

      idioma:
        funcion.idioma,

      precio:
        funcion.precio,

      precio_vip:
        funcion.precio_vip,

      precio_preventa:
        funcion.precio_preventa,

      fecha_fin_preventa:
        funcion.fecha_fin_preventa
          ? this.convertirAFechaLocal(
              funcion.fecha_fin_preventa
            )
          : null
    };

    this.mensajeError.set('');
    this.mensajeExito.set('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  cancelarEdicion() {
    this.funcionEditandoId.set(null);

    this.formulario =
      this.crearFormularioVacio();
  }

  async cambiarEstado(
    funcion: FuncionAdmin
  ) {
    this.mensajeError.set('');
    this.mensajeExito.set('');

    const { error } =
      await this.adminFunciones
        .cambiarEstado(
          funcion.id,
          !funcion.activa
        );

    if (error) {
      this.mensajeError.set(
        error.message
      );
      return;
    }

    this.mensajeExito.set(
      funcion.activa
        ? 'Función desactivada.'
        : 'Función activada.'
    );

    await this.cargarDatos();
  }

  async eliminar(
    funcion: FuncionAdmin
  ) {
    const confirmar = window.confirm(
      `¿Eliminar definitivamente la función de "${funcion.peliculas.titulo}"?`
    );

    if (!confirmar) {
      return;
    }

    this.mensajeError.set('');
    this.mensajeExito.set('');

    const { error } =
      await this.adminFunciones
        .eliminarFuncion(funcion.id);

    if (error) {
      this.mensajeError.set(
        'No se puede eliminar la función. ' +
        'Puede tener entradas relacionadas.'
      );
      return;
    }

    this.mensajeExito.set(
      'Función eliminada correctamente.'
    );

    if (
      this.funcionEditandoId() ===
      funcion.id
    ) {
      this.cancelarEdicion();
    }

    await this.cargarDatos();
  }

  formatearFecha(fecha: string) {
    return new Intl.DateTimeFormat(
      'es-AR',
      {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    ).format(new Date(fecha));
  }

  private convertirAFechaLocal(
    fecha: string
  ) {
    const valor = new Date(fecha);

    const numero = (dato: number) =>
      dato.toString().padStart(2, '0');

    return (
      `${valor.getFullYear()}-` +
      `${numero(valor.getMonth() + 1)}-` +
      `${numero(valor.getDate())}T` +
      `${numero(valor.getHours())}:` +
      `${numero(valor.getMinutes())}`
    );
  }
}