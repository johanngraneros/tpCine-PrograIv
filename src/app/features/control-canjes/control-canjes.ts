import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CanjeControl } from '../../core/models/canje-control.interface';
import { ControlCanjesService } from '../../core/services/control-canjes.service';
import { traducirError } from '../../core/services/supabase.service';

@Component({
  selector: 'app-control-canjes',
  imports: [ReactiveFormsModule],
  templateUrl: './control-canjes.html',
  styleUrl: './control-canjes.css'
})
export class ControlCanjes {
  private formBuilder = inject(FormBuilder);
  private controlCanjesService = inject(ControlCanjesService);

  formulario = this.formBuilder.nonNullable.group({
    codigo: [
      '',
      [
        Validators.required,
        Validators.minLength(3)
      ]
    ]
  });

  buscando = signal(false);
  validando = signal(false);
  confirmandoEntrega = signal(false);

  canjeEncontrado = signal<CanjeControl | null>(null);

  mensajeError = signal('');
  mensajeExito = signal('');

  async buscarCanje() {
    if (this.buscando()) {
      return;
    }

    this.mensajeError.set('');
    this.mensajeExito.set('');
    this.canjeEncontrado.set(null);

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();

      this.mensajeError.set(
        'Ingresá un código de canje válido.'
      );

      return;
    }

    const codigo =
      this.normalizarCodigo(
        this.formulario.controls.codigo.value
      );

    if (!codigo) {
      this.mensajeError.set(
        'Ingresá un código de canje válido.'
      );

      return;
    }

    this.formulario.controls.codigo.setValue(codigo);
    this.buscando.set(true);

    const resultado =
      await this.controlCanjesService
        .buscarPorCodigo(codigo);

    if (resultado.error) {
      console.error(resultado.error);

      this.mensajeError.set(traducirError(resultado.error, 'No se pudo buscar el canje. Intentá nuevamente.'));

      this.buscando.set(false);
      return;
    }

    if (!resultado.data) {
      this.mensajeError.set(
        'No se encontró ningún canje con ese código.'
      );

      this.buscando.set(false);
      return;
    }

    const canje =
      resultado.data as unknown as CanjeControl;

    this.canjeEncontrado.set(canje);

    if (canje.estado === 'pendiente') {
      this.mensajeExito.set(
        'Canje encontrado. Verificá los datos antes de confirmar la entrega.'
      );
    } else if (canje.estado === 'utilizado') {
      this.mensajeError.set(
        'Este canje ya fue utilizado.'
      );
    } else {
      this.mensajeError.set(
        'Este canje fue cancelado y no puede utilizarse.'
      );
    }

    this.buscando.set(false);
  }

  async validarCanje() {
    const canje =
      this.canjeEncontrado();

    if (
      !canje ||
      canje.estado !== 'pendiente' ||
      this.validando()
    ) {
      return;
    }

    if (!this.confirmandoEntrega()) {
      this.confirmandoEntrega.set(true);
      return;
    }
    this.confirmandoEntrega.set(false);

    this.validando.set(true);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    const resultado =
      await this.controlCanjesService
        .marcarComoUtilizado(canje.id);

    if (resultado.error) {
      console.error(resultado.error);

      this.mensajeError.set(traducirError(resultado.error, 'No se pudo confirmar el canje. Intentá nuevamente.'));

      this.validando.set(false);
      return;
    }

    const canjeActualizado: CanjeControl = {
      ...canje,
      estado: 'utilizado',
      utilizado_at: new Date().toISOString()
    };

    this.canjeEncontrado.set(
      canjeActualizado
    );

    this.mensajeExito.set(
      'Producto entregado. El canje fue marcado como utilizado.'
    );

    this.validando.set(false);
  }

  limpiarResultado() {
    this.formulario.reset({
      codigo: ''
    });

    this.canjeEncontrado.set(null);
    this.mensajeError.set('');
    this.mensajeExito.set('');
  }

  obtenerNombreCliente(
    canje: CanjeControl
  ) {
    const perfil = canje.perfiles;

    if (!perfil) {
      return 'Usuario no disponible';
    }

    return [
      perfil.nombre,
      perfil.apellido
    ]
      .filter(Boolean)
      .join(' ');
  }

  formatearFecha(fecha: string | null) {
    if (!fecha) {
      return 'Sin registrar';
    }

    return new Intl.DateTimeFormat(
      'es-AR',
      {
        dateStyle: 'long',
        timeStyle: 'short'
      }
    ).format(new Date(fecha));
  }

  private normalizarCodigo(
    contenido: string
  ) {
    return contenido
      .trim()
      .replace(
        /^CINEIZE[\s:_-]*CANJE[\s:_-]*/i,
        ''
      )
      .replace(
        /^CANJE[\s:_-]*/i,
        ''
      );
  }
}
