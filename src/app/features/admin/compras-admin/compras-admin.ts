import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { startWith } from 'rxjs';
import { jsPDF } from 'jspdf';

import {
  CompraAdmin
} from '../../../core/models/compra-admin.interface';

import {
  AdminComprasService
} from '../../../core/services/admin-compras.service';

@Component({
  selector: 'app-compras-admin',
  imports: [ReactiveFormsModule],
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

  busquedaControl = new FormControl('', {
    nonNullable: true
  });

  estadoControl = new FormControl<
    'todas' | 'confirmada' | 'cancelada'
  >('todas', { nonNullable: true });

  private busqueda = toSignal(
    this.busquedaControl.valueChanges.pipe(
      startWith(this.busquedaControl.value)
    ),
    { initialValue: '' }
  );

  private estadoSeleccionado = toSignal(
    this.estadoControl.valueChanges.pipe(
      startWith(this.estadoControl.value)
    ),
    { initialValue: 'todas' as const }
  );

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

  obtenerNombreCliente(compra: CompraAdmin) {
    if (!compra.perfiles) {
      return compra.invitado_nombre
        ? `${compra.invitado_nombre} (invitado)`
        : 'Usuario no disponible';
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

  exportarPdf() {
    const compras = this.comprasFiltradas();

    if (compras.length === 0) {
      return;
    }

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const margen = 14;
    const anchoPagina = pdf.internal.pageSize.getWidth();
    let posicionY = 18;

    const dibujarEncabezado = () => {
      pdf.setTextColor(229, 9, 36);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.text('CINEIZE', margen, posicionY);

      pdf.setTextColor(30, 30, 30);
      pdf.setFontSize(15);
      pdf.text('Reporte de compras', margen, posicionY + 8);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(
        `Generado: ${this.formatearFecha(new Date().toISOString())}`,
        anchoPagina - margen,
        posicionY + 8,
        { align: 'right' }
      );

      posicionY += 18;
    };

    const dibujarColumnas = () => {
      pdf.setFillColor(28, 27, 24);
      pdf.rect(margen, posicionY, anchoPagina - margen * 2, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text('Fecha', margen + 2, posicionY + 5.3);
      pdf.text('Cliente', 47, posicionY + 5.3);
      pdf.text('Película', 102, posicionY + 5.3);
      pdf.text('Entradas', 191, posicionY + 5.3);
      pdf.text('Estado', 216, posicionY + 5.3);
      pdf.text('Total', 255, posicionY + 5.3);
      posicionY += 11;
    };

    dibujarEncabezado();
    dibujarColumnas();

    for (const compra of compras) {
      if (posicionY > 190) {
        pdf.addPage();
        posicionY = 18;
        dibujarEncabezado();
        dibujarColumnas();
      }

      const peliculas = this.obtenerPeliculas(compra);

      pdf.setTextColor(45, 45, 45);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.text(this.formatearFecha(compra.fecha), margen + 2, posicionY);
      pdf.text(
        this.recortar(this.obtenerNombreCliente(compra), 30),
        47,
        posicionY
      );
      pdf.text(this.recortar(peliculas, 48), 102, posicionY);
      pdf.text(String(compra.entradas.length), 191, posicionY);
      pdf.text(compra.estado, 216, posicionY);
      pdf.text(this.formatearPrecio(compra.total), 255, posicionY);

      pdf.setDrawColor(220, 220, 220);
      pdf.line(margen, posicionY + 3, anchoPagina - margen, posicionY + 3);
      posicionY += 8;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text(
      `Total del reporte: ${this.formatearPrecio(this.totalFiltrado())}`,
      anchoPagina - margen,
      posicionY + 4,
      { align: 'right' }
    );

    pdf.save(`reporte-compras-${this.fechaArchivo()}.pdf`);
  }

  exportarExcel() {
    const compras = this.comprasFiltradas();

    if (compras.length === 0) {
      return;
    }

    const encabezado = [
      'ID',
      'Fecha',
      'Cliente',
      'Películas',
      'Entradas',
      'Subtotal',
      'Descuento',
      'Crédito usado',
      'Total',
      'Estado',
      'Puntos ganados'
    ];

    const filas = compras.map(compra => [
      compra.id,
      this.formatearFecha(compra.fecha),
      this.obtenerNombreCliente(compra),
      this.obtenerPeliculas(compra),
      compra.entradas.length,
      Number(compra.subtotal),
      Number(compra.descuento),
      Number(compra.credito_usado),
      Number(compra.total),
      compra.estado,
      compra.puntos_ganados
    ]);

    const contenido = [encabezado, ...filas]
      .map(fila => fila.map(valor => this.escaparCsv(valor)).join(';'))
      .join('\r\n');

    const archivo = new Blob(
      [`\uFEFF${contenido}`],
      { type: 'text/csv;charset=utf-8' }
    );
    const enlace = document.createElement('a');
    const url = URL.createObjectURL(archivo);

    enlace.href = url;
    enlace.download = `reporte-compras-${this.fechaArchivo()}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  totalFiltrado() {
    return this.comprasFiltradas()
      .filter(compra => compra.estado === 'confirmada')
      .reduce((total, compra) => total + Number(compra.total), 0);
  }

  private obtenerPeliculas(compra: CompraAdmin) {
    const titulos = compra.entradas
      .map(entrada => entrada.funciones?.peliculas?.titulo)
      .filter((titulo): titulo is string => Boolean(titulo));

    return [...new Set(titulos)].join(', ') || 'Sin entradas';
  }

  private recortar(texto: string, maximo: number) {
    return texto.length > maximo
      ? `${texto.slice(0, maximo - 1)}…`
      : texto;
  }

  private escaparCsv(valor: string | number) {
    const texto = String(valor).replace(/"/g, '""');
    return `"${texto}"`;
  }

  private fechaArchivo() {
    return new Date().toISOString().slice(0, 10);
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
