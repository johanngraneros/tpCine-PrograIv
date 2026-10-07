import { Component, OnInit, inject, signal } from '@angular/core';
import { MiCompra, MiCompraEntrada } from '../../core/models/mi-compra.interface';
import { DatosEntradaPdf } from '../../core/models/datos-entrada-pdf.interface';
import { AuthService } from '../../core/services/auth.service';
import { EntradaDocumentoService } from '../../core/services/entrada-documento.service';
import { MisComprasService } from '../../core/services/mis-compras.service';
import { traducirError } from '../../core/services/supabase.service';
import QRCode from 'qrcode';

@Component({
  selector: 'app-mis-compras',
  imports: [],
  templateUrl: './mis-compras.html',
  styleUrl: './mis-compras.css'
})
export class MisCompras implements OnInit {
  private misComprasService =
    inject(MisComprasService);

  private authService =
    inject(AuthService);

  private entradaDocumento =
    inject(EntradaDocumentoService);

  compras = signal<MiCompra[]>([]);
  codigosCandy = signal<Record<string, string>>({});
  codigosEntradas = signal<Record<string, string>>({});
  credito = signal(0);
  nombreCliente = signal('Usuario registrado');

  cargando = signal(true);
  cancelandoId = signal<string | null>(null);
  confirmandoCancelacionId = signal<string | null>(null);
  generandoPdfId = signal<string | null>(null);

  mensajeError = signal('');
  mensajeExito = signal('');

  ngOnInit() {
    void this.cargarDatos();
  }

  async cargarDatos() {
    this.cargando.set(true);
    this.mensajeError.set('');

    await Promise.all([
      this.cargarCompras(),
      this.cargarCredito()
    ]);

    this.cargando.set(false);
  }

  private async cargarCompras() {
    const usuario =
      this.authService.currentUser();

    if (!usuario) {
      this.compras.set([]);
      return;
    }

    const resultado =
      await this.misComprasService
        .obtenerMisCompras(usuario.id);

    if (resultado.error) {
      console.error(resultado.error);

      this.mensajeError.set(traducirError(resultado.error, 'No se pudieron cargar tus compras. Intentá nuevamente.'));

      return;
    }

    const compras = (resultado.data ?? []) as unknown as MiCompra[];
    this.compras.set(compras);
    await Promise.all([
      this.generarCodigosCandy(compras),
      this.generarCodigosEntradas(compras)
    ]);
  }

  private async generarCodigosCandy(compras: MiCompra[]) {
    const pares = await Promise.all(
      compras
        .filter(compra => compra.compra_productos.length > 0 || compra.compra_combos.length > 0)
        .map(async compra => [
          compra.id,
          await QRCode.toDataURL(`CINEIZE:${compra.qr_code}`, { width: 220, margin: 1 })
        ] as const)
    );
    this.codigosCandy.set(Object.fromEntries(pares));
  }

  private async generarCodigosEntradas(compras: MiCompra[]) {
    const entradas = compras.flatMap(compra => compra.entradas);
    const pares = await Promise.all(
      entradas.map(async entrada => [
        entrada.id,
        await QRCode.toDataURL(`CINEIZE:${entrada.qr_code}`, { width: 180, margin: 1 })
      ] as const)
    );
    this.codigosEntradas.set(Object.fromEntries(pares));
  }

  async copiarCodigoEntrada(codigo: string) {
    try {
      await navigator.clipboard.writeText(this.formatearCodigoEntrada(codigo));
      this.mensajeError.set('');
      this.mensajeExito.set('Código de entrada copiado.');
    } catch {
      this.mensajeExito.set('');
      this.mensajeError.set('No se pudo copiar el código. Seleccionalo manualmente.');
    }
  }

  formatearCodigoEntrada(codigo: string) {
    return `CINEIZE:${codigo}`;
  }

  tieneCandy(compra: MiCompra) {
    return compra.compra_productos.length > 0 || compra.compra_combos.length > 0;
  }
  
  private async cargarCredito() {
    const usuario =
      this.authService.currentUser();

    if (!usuario) {
      return;
    }

    const { data, error } =
      await this.authService.getPerfil(
        usuario.id
      );

    if (error) {
      console.error(error);
      return;
    }

    this.credito.set(
      Number(data?.credito ?? 0)
    );

    const nombre = [data?.nombre, data?.apellido]
      .filter(Boolean)
      .join(' ');

    this.nombreCliente.set(
      nombre || 'Usuario registrado'
    );
  }

  async descargarEntradasPdf(compra: MiCompra) {
    const entradas: DatosEntradaPdf[] = compra.entradas
      .filter(entrada => entrada.estado !== 'cancelada')
      .map(entrada => ({
        qrCode: entrada.qr_code,
        pelicula: entrada.funciones.peliculas.titulo,
        fechaHora: this.formatearFecha(entrada.funciones.fecha_hora),
        sala: entrada.funciones.salas.nombre,
        fila: entrada.butacas.fila,
        numeroButaca: entrada.butacas.numero,
        tipoButaca: entrada.butacas.tipo,
        cliente: this.nombreCliente(),
        compraId: compra.id
      }));

    if (!entradas.length) return;

    this.generandoPdfId.set(`entradas-${compra.id}`);
    this.mensajeError.set('');

    try {
      await this.entradaDocumento.descargarPdfMultiple(entradas);
    } catch (error) {
      console.error(error);
      this.mensajeError.set('No se pudo generar el PDF de las entradas.');
    } finally {
      this.generandoPdfId.set(null);
    }
  }

  async descargarCandyPdf(compra: MiCompra) {
    if (!this.tieneCandy(compra)) return;

    this.generandoPdfId.set(`candy-${compra.id}`);
    this.mensajeError.set('');

    const items = [
      ...compra.compra_productos.map(item => ({
        nombre: item.productos.nombre,
        cantidad: item.cantidad,
        estado: item.estado
      })),
      ...compra.compra_combos.map(item => ({
        nombre: item.combos.nombre,
        cantidad: item.cantidad,
        estado: item.estado
      }))
    ];

    try {
      await this.entradaDocumento.descargarCandyPdf({
        qrCode: compra.qr_code,
        compraId: compra.id,
        fechaCompra: this.formatearFecha(compra.fecha),
        cliente: this.nombreCliente(),
        items
      });
    } catch (error) {
      console.error(error);
      this.mensajeError.set('No se pudo generar el PDF del Candy Bar.');
    } finally {
      this.generandoPdfId.set(null);
    }
  }

  entradaPrincipal(
    compra: MiCompra
  ): MiCompraEntrada | null {
    return compra.entradas[0] ?? null;
  }

  puedeCancelar(
    compra: MiCompra
  ) {
    if (compra.estado !== 'confirmada') {
      return false;
    }

    if (compra.entradas.length === 0) {
      return false;
    }

    const tieneEntradaUsada =
      compra.entradas.some(entrada => {
        return entrada.estado === 'usada';
      });

    if (tieneEntradaUsada) {
      return false;
    }

    const fechas = compra.entradas.map(
      entrada => {
        return new Date(
          entrada.funciones.fecha_hora
        ).getTime();
      }
    );

    const fechaMasCercana =
      Math.min(...fechas);

    const limiteCancelacion =
      fechaMasCercana -
      2 * 60 * 60 * 1000;

    return Date.now() < limiteCancelacion;
  }

  motivoNoCancelable(
    compra: MiCompra
  ) {
    if (compra.estado === 'cancelada') {
      return 'Esta compra ya fue cancelada.';
    }

    if (
      compra.entradas.some(entrada => {
        return entrada.estado === 'usada';
      })
    ) {
      return 'La entrada ya fue utilizada.';
    }

    if (compra.entradas.length === 0) {
      return 'La compra no tiene entradas.';
    }

    return 'El plazo de cancelación finalizó. Deben faltar más de 2 horas para la función.';
  }

  creditoARecibir(
    compra: MiCompra
  ) {
    return (
      Number(compra.total) +
      Number(compra.credito_usado)
    );
  }

  async cancelarCompra(
    compra: MiCompra
  ) {
    if (!this.puedeCancelar(compra)) {
      return;
    }

    if (this.confirmandoCancelacionId() !== compra.id) {
      this.confirmandoCancelacionId.set(compra.id);
      return;
    }
    this.confirmandoCancelacionId.set(null);

    const credito = this.formatearPrecio(this.creditoARecibir(compra));

    this.cancelandoId.set(compra.id);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    const resultado =
      await this.misComprasService
        .cancelarMiCompra(compra.id);

    if (resultado.error) {
      console.error(resultado.error);

      this.mensajeError.set(traducirError(resultado.error, 'No se pudo cancelar la compra. Intentá nuevamente.'));

      this.cancelandoId.set(null);
      return;
    }

    await Promise.all([
      this.cargarCompras(),
      this.cargarCredito()
    ]);

    this.mensajeExito.set(
      `Compra cancelada. Se acreditaron ${credito} en tu cuenta.`
    );

    this.cancelandoId.set(null);
  }

  formatearFecha(fecha: string) {
    return new Intl.DateTimeFormat(
      'es-AR',
      {
        dateStyle: 'long',
        timeStyle: 'short'
      }
    ).format(new Date(fecha));
  }

  formatearPrecio(
    valor: number
  ) {
    return new Intl.NumberFormat(
      'es-AR',
      {
        style: 'currency',
        currency: 'ARS'
      }
    ).format(Number(valor));
  }
}
