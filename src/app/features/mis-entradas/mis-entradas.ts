import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import {
  MiEntrada
} from '../../core/models/mis-entrada.interface';

import {
  DatosEntradaPdf
} from '../../core/models/datos-entrada-pdf.interface';

import {
  MisEntradasService
} from '../../core/services/mis-entradas.service';
import { traducirError } from '../../core/services/supabase.service';

import {
  EntradaDocumentoService
} from '../../core/services/entrada-documento.service';

@Component({
  selector: 'app-mis-entradas',
  imports: [],
  templateUrl: './mis-entradas.html',
  styleUrl: './mis-entradas.css'
})
export class MisEntradas implements OnInit {
  private misEntradasService = inject(
    MisEntradasService
  );

  private entradaDocumento = inject(
    EntradaDocumentoService
  );

  entradas = signal<MiEntrada[]>([]);
  imagenesQr = signal<Record<string, string>>({});

  cargando = signal(true);
  generandoPdfId = signal<string | null>(null);

  mensajeError = signal('');

  filtro = signal<
    'todas' | 'vigentes' | 'utilizadas' | 'canceladas'
  >('vigentes');

  entradasFiltradas = computed(() => {
    const filtroActual = this.filtro();

    return this.entradas().filter(entrada => {
      if (filtroActual === 'todas') {
        return true;
      }

      if (filtroActual === 'vigentes') {
        return entrada.estado === 'valida';
      }

      if (filtroActual === 'utilizadas') {
        return entrada.estado === 'usada';
      }

      return entrada.estado === 'cancelada';
    });
  });

  totalVigentes = computed(() => {
    return this.entradas().filter(
      entrada => entrada.estado === 'valida'
    ).length;
  });

  totalUtilizadas = computed(() => {
    return this.entradas().filter(
      entrada => entrada.estado === 'usada'
    ).length;
  });

  totalCanceladas = computed(() => {
    return this.entradas().filter(
      entrada => entrada.estado === 'cancelada'
    ).length;
  });

  ngOnInit() {
    this.cargarEntradas();
  }

  async cargarEntradas() {
    this.cargando.set(true);
    this.mensajeError.set('');

    const resultado =
      await this.misEntradasService.obtenerMisEntradas();

    if (resultado.error) {
      console.error(resultado.error);

      this.mensajeError.set(traducirError(resultado.error, 'No se pudieron cargar tus entradas. Intentá nuevamente.'));

      this.cargando.set(false);
      return;
    }

    const entradas =
      (resultado.data ?? []) as unknown as MiEntrada[];

    this.entradas.set(entradas);

    await this.generarImagenesQr(entradas);

    this.cargando.set(false);
  }

  async generarImagenesQr(
    entradas: MiEntrada[]
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

  cambiarFiltro(
    filtro:
      | 'todas'
      | 'vigentes'
      | 'utilizadas'
      | 'canceladas'
  ) {
    this.filtro.set(filtro);
  }

  obtenerNombreCliente(
    entrada: MiEntrada
  ) {
    const perfil = entrada.compras?.perfiles;

    if (!perfil) {
      return 'Usuario registrado';
    }

    return [
      perfil.nombre,
      perfil.apellido
    ]
      .filter(Boolean)
      .join(' ');
  }

  formatearFecha(fecha: string) {
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'long',
      timeStyle: 'short'
    }).format(new Date(fecha));
  }

  async descargarPdf(
    entrada: MiEntrada
  ) {
    if (entrada.estado === 'cancelada') {
      return;
    }

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
