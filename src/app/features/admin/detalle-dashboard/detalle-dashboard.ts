import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { startWith } from 'rxjs';
import { jsPDF } from 'jspdf';
import { CompraAdmin } from '../../../core/models/compra-admin.interface';
import { AdminComprasService } from '../../../core/services/admin-compras.service';

interface ActividadReciente {
  id: number;
  detalle: string;
  fecha: string;
  perfiles: { nombre: string; apellido: string | null } | null;
}

type SeccionDashboard = 'facturacion' | 'estadisticas' | 'descuentos' | 'actividad';

@Component({
  selector: 'app-detalle-dashboard',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './detalle-dashboard.html',
  styleUrls: ['../dashboard/dashboard.css']
})
export class DetalleDashboard implements OnInit {
  private servicio = inject(AdminComprasService);
  private ruta = inject(ActivatedRoute);
  private formBuilder = inject(FormBuilder);
  seccion = this.ruta.snapshot.data['seccion'] as SeccionDashboard;
  compras = signal<CompraAdmin[]>([]);
  actividad = signal<ActividadReciente[]>([]);
  productoMasVendido = signal<{ id: string; nombre: string; cantidad: number } | null>(null);
  cargando = signal(true);
  error = signal('');
  guardando = signal(false);
  mensaje = signal('');
  periodoControl = new FormControl<7 | 30>(7, { nonNullable: true });
  private periodo = toSignal(this.periodoControl.valueChanges.pipe(startWith(this.periodoControl.value)), { initialValue: 7 as 7 | 30 });

  descuentosForm = this.formBuilder.nonNullable.group({
    primeraCompra: [20, [Validators.required, Validators.min(0), Validators.max(100)]],
    mayores50: [10, [Validators.required, Validators.min(0), Validators.max(100)]]
  });

  reporteDiario = computed(() => {
    const dias = new Map<string, { fecha: Date; facturacion: number; entradas: number }>();
    for (const compra of this.compras()) {
      if (compra.estado !== 'confirmada') continue;
      const fecha = new Date(compra.fecha);
      const clave = `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`;
      const actual = dias.get(clave) ?? { fecha: new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()), facturacion: 0, entradas: 0 };
      actual.facturacion += Number(compra.total);
      actual.entradas += compra.entradas.filter(item => item.estado !== 'cancelada').length;
      dias.set(clave, actual);
    }
    return [...dias.values()].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  });

  ranking = computed(() => {
    const ahora = Date.now();
    const desde = ahora - this.periodo() * 86400000;
    const cantidades = new Map<string, number>();
    for (const compra of this.compras()) {
      if (compra.estado !== 'confirmada') continue;
      for (const entrada of compra.entradas) {
        const fecha = new Date(entrada.funciones.fecha_hora).getTime();
        if (entrada.estado !== 'usada' || fecha < desde || fecha > ahora) continue;
        const titulo = entrada.funciones.peliculas.titulo;
        cantidades.set(titulo, (cantidades.get(titulo) ?? 0) + 1);
      }
    }
    return [...cantidades].map(([titulo, entradas]) => ({ titulo, entradas })).sort((a, b) => b.entradas - a.entradas).slice(0, 5);
  });
  mayorCantidad = computed(() => this.ranking()[0]?.entradas ?? 0);
  totalFacturacion = computed(() =>
    this.reporteDiario().reduce((total, dia) => total + dia.facturacion, 0)
  );
  totalEntradas = computed(() =>
    this.reporteDiario().reduce((total, dia) => total + dia.entradas, 0)
  );

  async ngOnInit() {
    if (this.seccion === 'facturacion') {
      const { data, error } = await this.servicio.obtenerComprasParaEstadisticas();
      if (error) this.error.set('No se pudieron cargar las estadísticas.');
      else this.compras.set((data ?? []) as unknown as CompraAdmin[]);
    } else if (this.seccion === 'estadisticas') {
      const [compras, producto] = await Promise.all([
        this.servicio.obtenerComprasParaEstadisticas(),
        this.servicio.obtenerProductoCandyMasVendido()
      ]);
      if (compras.error || producto.error) {
        this.error.set('No se pudieron cargar los gráficos.');
      } else {
        this.compras.set((compras.data ?? []) as unknown as CompraAdmin[]);
        this.productoMasVendido.set(producto.data);
      }
    } else if (this.seccion === 'descuentos') {
      const { data, error } = await this.servicio.obtenerConfiguracionDescuentos();
      if (error) this.error.set('No se pudo cargar la configuración.');
      else if (data) this.descuentosForm.setValue({ primeraCompra: Number(data.porcentaje_primera_compra), mayores50: Number(data.porcentaje_mayores_50) });
    } else {
      const { data, error } = await this.servicio.obtenerActividadReciente();
      if (error) this.error.set('No se pudo cargar la actividad.');
      else this.actividad.set((data ?? []) as unknown as ActividadReciente[]);
    }
    this.cargando.set(false);
  }

  async guardarDescuentos() {
    if (this.descuentosForm.invalid || this.guardando()) { this.descuentosForm.markAllAsTouched(); return; }
    this.guardando.set(true);
    const valores = this.descuentosForm.getRawValue();
    const { error } = await this.servicio.actualizarConfiguracionDescuentos(valores.primeraCompra, valores.mayores50);
    this.mensaje.set(error ? 'No se pudieron guardar los descuentos.' : 'Descuentos actualizados correctamente.');
    this.guardando.set(false);
  }

  anchoBarra(valor: number) { return this.mayorCantidad() ? valor / this.mayorCantidad() * 100 : 0; }
  formatearFecha(fecha: Date) { return new Intl.DateTimeFormat('es-AR').format(fecha); }
  formatearPrecio(valor: number) { return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(valor); }
  nombreActor(item: ActividadReciente) { return item.perfiles ? [item.perfiles.nombre, item.perfiles.apellido].filter(Boolean).join(' ') : 'Personal del cine'; }
  formatearFechaHora(fecha: string) { return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(fecha)); }

  exportarPdf() {
    const filas = this.reporteDiario();
    if (!filas.length) return;

    const pdf = new jsPDF();
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.text('CINEIZE - Reporte de facturacion', 14, 20);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`Generado: ${new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}`, 14, 28);

    let y = 42;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Fecha', 14, y);
    pdf.text('Entradas', 92, y);
    pdf.text('Facturacion', 132, y);
    pdf.line(14, y + 3, 196, y + 3);

    pdf.setFont('helvetica', 'normal');
    for (const dia of filas) {
      y += 9;
      if (y > 278) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(this.formatearFecha(dia.fecha), 14, y);
      pdf.text(String(dia.entradas), 92, y);
      pdf.text(this.formatearPrecio(dia.facturacion), 132, y);
    }

    y += 12;
    if (y > 278) {
      pdf.addPage();
      y = 20;
    }
    pdf.line(14, y - 6, 196, y - 6);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL', 14, y);
    pdf.text(String(this.totalEntradas()), 92, y);
    pdf.text(this.formatearPrecio(this.totalFacturacion()), 132, y);
    pdf.save(`cineize-facturacion-${this.fechaArchivo()}.pdf`);
  }

  exportarExcel() {
    const filas = this.reporteDiario();
    if (!filas.length) return;

    const filasXml = filas.map(dia => `
      <Row>
        <Cell><Data ss:Type="String">${this.formatearFecha(dia.fecha)}</Data></Cell>
        <Cell><Data ss:Type="Number">${dia.entradas}</Data></Cell>
        <Cell ss:StyleID="Moneda"><Data ss:Type="Number">${dia.facturacion}</Data></Cell>
      </Row>`).join('');
    const contenido = `<?xml version="1.0"?>
      <?mso-application progid="Excel.Sheet"?>
      <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
        xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
        <Styles>
          <Style ss:ID="Encabezado"><Font ss:Bold="1"/><Interior ss:Color="#FFDD00" ss:Pattern="Solid"/></Style>
          <Style ss:ID="Moneda"><NumberFormat ss:Format="[$$-es-AR] #,##0.00"/></Style>
        </Styles>
        <Worksheet ss:Name="Facturacion diaria">
          <Table>
            <Column ss:Width="100"/><Column ss:Width="80"/><Column ss:Width="120"/>
            <Row ss:StyleID="Encabezado">
              <Cell><Data ss:Type="String">Fecha</Data></Cell>
              <Cell><Data ss:Type="String">Entradas</Data></Cell>
              <Cell><Data ss:Type="String">Facturacion</Data></Cell>
            </Row>
            ${filasXml}
            <Row ss:StyleID="Encabezado">
              <Cell><Data ss:Type="String">TOTAL</Data></Cell>
              <Cell><Data ss:Type="Number">${this.totalEntradas()}</Data></Cell>
              <Cell ss:StyleID="Moneda"><Data ss:Type="Number">${this.totalFacturacion()}</Data></Cell>
            </Row>
          </Table>
        </Worksheet>
      </Workbook>`;

    const blob = new Blob(['\ufeff', contenido], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `cineize-facturacion-${this.fechaArchivo()}.xls`;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  private fechaArchivo() {
    return new Date().toISOString().slice(0, 10);
  }
}
