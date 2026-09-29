import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { FormsModule } from '@angular/forms';

import {
  CompraAdmin
} from '../../../core/models/compra-admin.interface';

import {
  AdminComprasService
} from '../../../core/services/admin-compras.service';

@Component({
  selector: 'app-compras-admin',
  imports: [FormsModule],
  templateUrl: './compras-admin.html',
  styleUrl: './compras-admin.css'
})
export class ComprasAdmin implements OnInit {
  private adminCompras = inject(AdminComprasService);

  compras = signal<CompraAdmin[]>([]);
  cargando = signal(true);
  cancelandoId = signal<string | null>(null);

  mensajeError = signal('');
  mensajeExito = signal('');

  busqueda = signal('');
  estadoSeleccionado = signal<
    'todas' | 'confirmada' | 'cancelada'
  >('todas');

  comprasFiltradas = computed(() => {
    const texto = this.busqueda()
      .trim()
      .toLocaleLowerCase();

    const estado = this.estadoSeleccionado();

    return this.compras().filter(compra => {
      const coincideEstado =
        estado === 'todas' ||
        compra.estado === estado;

      const nombreCliente = this.obtenerNombreCliente(compra)
        .toLocaleLowerCase();

      const contenidoEntradas = compra.entradas
        .map(entrada => {
          return [
            entrada.funciones?.peliculas?.titulo,
            entrada.funciones?.salas?.nombre,
            entrada.butacas?.fila,
            entrada.butacas?.numero,
            entrada.qr_code
          ]
            .filter(Boolean)
            .join(' ');
        })
        .join(' ')
        .toLocaleLowerCase();

      const coincideBusqueda =
        !texto ||
        compra.id.toLocaleLowerCase().includes(texto) ||
        nombreCliente.includes(texto) ||
        contenidoEntradas.includes(texto);

      return coincideEstado && coincideBusqueda;
    });
  });

  totalConfirmadas = computed(() => {
    return this.compras().filter(
      compra => compra.estado === 'confirmada'
    ).length;
  });

  totalCanceladas = computed(() => {
    return this.compras().filter(
      compra => compra.estado === 'cancelada'
    ).length;
  });

  ingresosConfirmados = computed(() => {
    return this.compras()
      .filter(compra => compra.estado === 'confirmada')
      .reduce((total, compra) => {
        return total + Number(compra.total);
      }, 0);
  });

  ngOnInit() {
    this.cargarCompras();
  }

  async cargarCompras() {
    this.cargando.set(true);
    this.mensajeError.set('');

    const resultado =
      await this.adminCompras.obtenerCompras();

    if (resultado.error) {
      console.error(resultado.error);

      this.mensajeError.set(
        resultado.error.message
      );

      this.cargando.set(false);
      return;
    }

    const compras =
      (resultado.data ?? []) as unknown as CompraAdmin[];

    this.compras.set(compras);
    this.cargando.set(false);
  }

  actualizarBusqueda(evento: Event) {
    const input = evento.target as HTMLInputElement;
    this.busqueda.set(input.value);
  }

  actualizarEstado(evento: Event) {
    const select = evento.target as HTMLSelectElement;

    this.estadoSeleccionado.set(
      select.value as
        | 'todas'
        | 'confirmada'
        | 'cancelada'
    );
  }

  obtenerNombreCliente(compra: CompraAdmin) {
    if (!compra.perfiles) {
      return 'Usuario no disponible';
    }

    return [
      compra.perfiles.nombre,
      compra.perfiles.apellido
    ]
      .filter(Boolean)
      .join(' ');
  }

  formatearFecha(fecha: string) {
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(new Date(fecha));
  }

  formatearPrecio(valor: number) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 2
    }).format(Number(valor));
  }

  async cancelarCompra(compra: CompraAdmin) {
    if (compra.estado === 'cancelada') {
      return;
    }

    const confirmada = window.confirm(
      `¿Cancelar la compra de ${this.obtenerNombreCliente(compra)}?`
    );

    if (!confirmada) {
      return;
    }

    this.cancelandoId.set(compra.id);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    const resultado =
      await this.adminCompras.cancelarCompra(compra.id);

    if (resultado.error) {
      console.error(resultado.error);

      this.mensajeError.set(
        resultado.error.message ||
          'No se pudo cancelar la compra.'
      );

      this.cancelandoId.set(null);
      return;
    }

    this.mensajeExito.set(
      'Compra cancelada. Las butacas volvieron a estar disponibles.'
    );

    this.cancelandoId.set(null);
    await this.cargarCompras();
  }
}