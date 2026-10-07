import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatosEntradaPdf } from '../../../core/models/datos-entrada-pdf.interface';
import { EntradaAdmin } from '../../../core/models/entrada-admin.interface';
import { AdminEntradasService } from '../../../core/services/admin-entradas.service';
import { EntradaDocumentoService } from '../../../core/services/entrada-documento.service';
import { traducirError } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-entradas-admin',
  imports: [],
  templateUrl: './entradas-admin.html',
  styleUrl: './entradas-admin.css'
})
export class EntradasAdmin implements OnInit {
  private adminEntradas =
    inject(AdminEntradasService);

  private entradaDocumento =
    inject(EntradaDocumentoService);

  entradas = signal<EntradaAdmin[]>([]);

  imagenesQr = signal<
    Record<string, string>
  >({});

  cargando = signal(true);

  generandoPdfId =
    signal<string | null>(null);

  mensajeError = signal('');
  busqueda = signal('');

  estadoSeleccionado = signal<
    'todas' | 'valida' | 'usada' | 'cancelada'
  >('todas');

  entradasFiltradas = computed(() => {
    const texto = this.busqueda()
      .trim()
      .toLocaleLowerCase();

    const estado = this.estadoSeleccionado();

    return this.entradas().filter(entrada => {
      const coincideEstado =
        estado === 'todas' ||
        entrada.estado === estado;

      const cliente =
        this.obtenerNombreCliente(entrada)
          .toLocaleLowerCase();

      const pelicula =
        entrada.funciones?.peliculas?.titulo
          ?.toLocaleLowerCase() ?? '';

      const sala =
        entrada.funciones?.salas?.nombre
          ?.toLocaleLowerCase() ?? '';

      const butaca = [
        entrada.butacas?.fila,
        entrada.butacas?.numero,
        entrada.butacas?.tipo
      ]
        .filter(valor => {
          return (
            valor !== null &&
            valor !== undefined
          );
        })
        .join(' ')
        .toLocaleLowerCase();

      const coincideBusqueda =
        !texto ||
        entrada.id
          .toLocaleLowerCase()
          .includes(texto) ||
        entrada.qr_code
          .toLocaleLowerCase()
          .includes(texto) ||
        cliente.includes(texto) ||
        pelicula.includes(texto) ||
        sala.includes(texto) ||
        butaca.includes(texto);

      return (
        coincideEstado &&
        coincideBusqueda
      );
    });
  });

  totalValidas = computed(() => {
    return this.entradas().filter(entrada => {
      return entrada.estado === 'valida';
    }).length;
  });

  totalUsadas = computed(() => {
    return this.entradas().filter(entrada => {
      return entrada.estado === 'usada';
    }).length;
  });

  totalCanceladas = computed(() => {
    return this.entradas().filter(entrada => {
      return entrada.estado === 'cancelada';
    }).length;
  });

  ngOnInit() {
    void this.cargarEntradas();
  }

  async cargarEntradas() {
    this.cargando.set(true);
    this.mensajeError.set('');

    const resultado =
      await this.adminEntradas.obtenerEntradas();

    if (resultado.error) {
      console.error(resultado.error);

      this.mensajeError.set(traducirError(resultado.error, 'No se pudieron cargar las entradas. Intentá nuevamente.'));

      this.cargando.set(false);
      return;
    }

    const entradas =
      (resultado.data ?? []) as unknown as EntradaAdmin[];

    this.entradas.set(entradas);

    await this.generarImagenesQr(entradas);

    this.cargando.set(false);
  }

  async generarImagenesQr(
    entradas: EntradaAdmin[]
  ) {
    const imagenes: Record<string, string> = {};

    await Promise.all(
      entradas.map(async entrada => {
        try {
          imagenes[entrada.id] =
            await this.entradaDocumento.generarQr(
              entrada.qr_code
            );
        } catch (error) {
          console.error(
            'No se pudo generar el QR:',
            error
          );
        }
      })
    );

    this.imagenesQr.set(imagenes);
  }

  actualizarBusqueda(evento: Event) {
    const input =
      evento.target as HTMLInputElement;

    const codigo = input.value.replace(
      /^CINEIZE:/i,
      ''
    );

    this.busqueda.set(codigo);
  }

  actualizarEstado(evento: Event) {
    const select =
      evento.target as HTMLSelectElement;

    this.estadoSeleccionado.set(
      select.value as
        | 'todas'
        | 'valida'
        | 'usada'
        | 'cancelada'
    );
  }

  obtenerNombreCliente(
    entrada: EntradaAdmin
  ) {
    const perfil =
      entrada.compras?.perfiles;

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

  formatearFecha(fecha: string) {
    return new Intl.DateTimeFormat(
      'es-AR',
      {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    ).format(new Date(fecha));
  }

  async descargarEntradaPdf(
    entrada: EntradaAdmin
  ) {
    this.generandoPdfId.set(entrada.id);
    this.mensajeError.set('');

    const datos: DatosEntradaPdf = {
      qrCode: entrada.qr_code,

      pelicula:
        entrada.funciones.peliculas.titulo,

      fechaHora:
        this.formatearFecha(
          entrada.funciones.fecha_hora
        ),

      sala:
        entrada.funciones.salas.nombre,

      fila:
        entrada.butacas.fila,

      numeroButaca:
        entrada.butacas.numero,

      tipoButaca:
        entrada.butacas.tipo,

      cliente:
        this.obtenerNombreCliente(entrada),

      compraId:
        entrada.compra_id
    };

    try {
      await this.entradaDocumento.descargarPdf(
        datos
      );
    } catch (error) {
      console.error(error);

      this.mensajeError.set(
        'No se pudo generar el PDF de la entrada.'
      );
    } finally {
      this.generandoPdfId.set(null);
    }
  }
}
