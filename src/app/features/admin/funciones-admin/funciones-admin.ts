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
  ValidationErrors,
  Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  AdminFuncionesService
} from '../../../core/services/admin-funciones.service';
import { traducirError } from '../../../core/services/supabase.service';

import type {
  FuncionAdmin,
  FuncionFormulario,
  PeliculaFuncionAdmin
} from '../../../core/models/funcion-admin.interface';
import { convertirFechaHoraAISO, enmascararFechaHora, fechaHoraParaMostrar } from '../../../core/utils/fecha.utils';

@Component({
  selector: 'app-funciones-admin',
  imports: [
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './funciones-admin.html',
  styleUrl: './funciones-admin.css'
})
export class FuncionesAdmin implements OnInit {
  private adminFunciones =
    inject(AdminFuncionesService);
  private formBuilder = inject(FormBuilder);

  funciones = signal<FuncionAdmin[]>([]);

  peliculas =
    signal<PeliculaFuncionAdmin[]>([]);

  cargando = signal(true);
  guardando = signal(false);

  mensajeError = signal('');
  confirmandoEliminacionId = signal<string | null>(null);
  mensajeExito = signal('');

  funcionEditandoId =
    signal<string | null>(null);

  formulario = this.formBuilder.group({
    pelicula_id: ['', Validators.required],
    fecha_hora: ['', [Validators.required, control => convertirFechaHoraAISO(control.value) ? null : { fechaHoraInvalida: true }]],
    duracion_min: [90, [Validators.required, Validators.min(1), Validators.max(600)]],
    formato: ['2D', Validators.required],
    idioma: ['castellano', Validators.required],
    precio: [0, [Validators.required, Validators.min(0)]],
    precio_vip: this.formBuilder.control<number | null>(null, Validators.min(0)),
    precio_preventa: this.formBuilder.control<number | null>(null, Validators.min(0)),
    fecha_fin_preventa: this.formBuilder.control<string | null>(null, control => !control.value || convertirFechaHoraAISO(control.value) ? null : { fechaHoraInvalida: true })
  }, { validators: [this.validarPreventa] });

  async ngOnInit() {
    await this.cargarDatos();
  }

  private validarPreventa(control: AbstractControl): ValidationErrors | null {
    const precio = control.get('precio_preventa')?.value;
    const fecha = control.get('fecha_fin_preventa')?.value;
    return (precio !== null && precio !== '' && !fecha) ||
      ((precio === null || precio === '') && Boolean(fecha))
      ? { preventaIncompleta: true }
      : null;
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
        this.formulario.controls.pelicula_id.value
    );

    if (pelicula) {
      this.formulario.controls.duracion_min.setValue(
        pelicula.duracion_min
      );
    }
  }

  aplicarMascaraFechaHora(control: AbstractControl) {
    control.setValue(enmascararFechaHora(String(control.value ?? '')), { emitEvent: false });
  }

  validarFormulario(): string {
    const formulario = this.formulario.getRawValue();

    if (!formulario.pelicula_id) {
      return 'Seleccioná una película.';
    }

    if (!formulario.fecha_hora) {
      return 'Seleccioná la fecha y el horario.';
    }

    const fechaFuncionIso = convertirFechaHoraAISO(formulario.fecha_hora);
    if (!fechaFuncionIso) return 'Ingresá la fecha y hora como dd/mm/aaaa hh:mm.';
    const fechaFuncion = new Date(fechaFuncionIso);

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
        formulario.duracion_min
      ) ||
      Number(formulario.duracion_min) <= 0
    ) {
      return 'La duración debe ser mayor a cero.';
    }

    if (Number(formulario.precio) < 0) {
      return 'El precio no puede ser negativo.';
    }

    if (
      formulario.precio_vip !== null &&
      Number(formulario.precio_vip) < 0
    ) {
      return 'El precio VIP no puede ser negativo.';
    }

    const tienePrecioPreventa =
      formulario.precio_preventa !== null;

    const tieneFechaPreventa =
      Boolean(
        formulario.fecha_fin_preventa
      );

    if (
      tienePrecioPreventa !==
      tieneFechaPreventa
    ) {
      return 'Completá juntos el precio y el final de la preventa.';
    }

    if (
      formulario.precio_preventa !==
        null &&
      Number(formulario.precio_preventa) < 0
    ) {
      return 'El precio de preventa no puede ser negativo.';
    }

    if (
      formulario.fecha_fin_preventa
    ) {
      const finPreventaIso = convertirFechaHoraAISO(formulario.fecha_fin_preventa);
      if (!finPreventaIso) return 'Ingresá el final de preventa como dd/mm/aaaa hh:mm.';
      const finPreventa = new Date(finPreventaIso);

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

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.mensajeError.set('Revisá los datos ingresados en el formulario.');
      return;
    }

    const funcionId =
      this.funcionEditandoId();
    const valores = this.formulario.getRawValue();
    const datos = {
      ...valores,
      fecha_hora: convertirFechaHoraAISO(valores.fecha_hora)!,
      fecha_fin_preventa: valores.fecha_fin_preventa
        ? convertirFechaHoraAISO(valores.fecha_fin_preventa)
        : null
    } as FuncionFormulario;

    const resultado = funcionId
      ? await this.adminFunciones
          .actualizarFuncion(
            funcionId,
            datos
          )
      : await this.adminFunciones
          .crearFuncion(datos);

    this.guardando.set(false);

    if (resultado.error) {
      this.mensajeError.set(traducirError(resultado.error, 'No se pudo guardar la función. Intentá nuevamente.'));
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

    this.formulario.reset({
      pelicula_id:
        funcion.pelicula_id,

      fecha_hora:
        fechaHoraParaMostrar(
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
          ? fechaHoraParaMostrar(
              funcion.fecha_fin_preventa
            )
          : null
    });

    this.mensajeError.set('');
    this.mensajeExito.set('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  cancelarEdicion() {
    this.funcionEditandoId.set(null);

    this.formulario.reset({
      pelicula_id: '',
      fecha_hora: '',
      duracion_min: 90,
      formato: '2D',
      idioma: 'castellano',
      precio: 0,
      precio_vip: null,
      precio_preventa: null,
      fecha_fin_preventa: null
    });
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
      this.mensajeError.set(traducirError(error, 'No se pudo eliminar la función. Intentá nuevamente.'));
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
    if (this.confirmandoEliminacionId() !== funcion.id) {
      this.confirmandoEliminacionId.set(funcion.id);
      return;
    }
    this.confirmandoEliminacionId.set(null);

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

}
