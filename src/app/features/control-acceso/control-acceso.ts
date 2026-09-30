import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { EntradaAdmin } from '../../core/models/entrada-admin.interface';
import { AdminEntradasService } from '../../core/services/admin-entradas.service';

@Component({
  selector: 'app-control-acceso',
  imports: [],
  templateUrl: './control-acceso.html',
  styleUrl: './control-acceso.css'
})
export class ControlAcceso implements OnInit, OnDestroy {
  @ViewChild('videoScanner')
  private videoScanner?: ElementRef<HTMLVideoElement>;

  private adminEntradas = inject(AdminEntradasService);

  private lectorQr = new BrowserQRCodeReader();
  private controlesScanner?: IScannerControls;

  private entradas = signal<EntradaAdmin[]>([]);

  cargando = signal(true);
  validando = signal(false);

  scannerActivo = signal(false);
  iniciandoScanner = signal(false);

  codigoManual = signal('');
  entradaEncontrada = signal<EntradaAdmin | null>(null);

  mensajeScanner = signal('');
  mensajeError = signal('');
  mensajeExito = signal('');

  ngOnInit() {
    void this.cargarEntradas();
  }

  ngOnDestroy() {
    this.detenerScanner();
  }

  private async cargarEntradas() {
    this.cargando.set(true);
    this.mensajeError.set('');

    const resultado =
      await this.adminEntradas.obtenerEntradas();

    if (resultado.error) {
      console.error(resultado.error);

      this.mensajeError.set(
        resultado.error.message
      );

      this.cargando.set(false);
      return;
    }

    this.entradas.set(
      (resultado.data ?? []) as unknown as EntradaAdmin[]
    );

    this.cargando.set(false);
  }

  actualizarCodigoManual(evento: Event) {
    const input =
      evento.target as HTMLInputElement;

    this.codigoManual.set(input.value);
  }

  buscarCodigoManual(evento: Event) {
    evento.preventDefault();

    this.mensajeError.set('');
    this.mensajeExito.set('');

    this.procesarCodigo(
      this.codigoManual()
    );
  }

  async alternarScanner() {
    if (this.scannerActivo()) {
      this.detenerScanner();
      return;
    }

    this.entradaEncontrada.set(null);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    this.scannerActivo.set(true);
    this.iniciandoScanner.set(true);

    this.mensajeScanner.set(
      'Solicitando acceso a la cámara...'
    );

    /*
     * Espera a que Angular agregue el video
     * al DOM antes de iniciar la cámara.
     */
    setTimeout(() => {
      void this.iniciarScanner();
    });
  }

  private async iniciarScanner() {
    const video =
      this.videoScanner?.nativeElement;

    if (!video) {
      this.mensajeError.set(
        'No se pudo inicializar el lector QR.'
      );

      this.detenerScanner();
      return;
    }

    try {
      this.controlesScanner =
        await this.lectorQr.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: {
                ideal: 'environment'
              }
            }
          },
          video,
          result => {
            if (!result) {
              return;
            }

            this.procesarCodigo(
              result.getText()
            );
          }
        );

      this.iniciandoScanner.set(false);

      this.mensajeScanner.set(
        'Apuntá la cámara al código QR de la entrada.'
      );
    } catch (error) {
      console.error(
        'No se pudo abrir la cámara:',
        error
      );

      this.mensajeError.set(
        'No se pudo acceder a la cámara. Revisá los permisos del navegador.'
      );

      this.detenerScanner();
    }
  }

  private procesarCodigo(
    contenido: string
  ) {
    const codigo = contenido
      .trim()
      .replace(/^CINEIZE:/i, '');

    if (!codigo) {
      this.entradaEncontrada.set(null);

      this.mensajeError.set(
        'Ingresá o escaneá un código QR.'
      );

      return;
    }

    const entrada =
      this.entradas().find(item => {
        const codigoBuscado =
          codigo.toLocaleLowerCase();

        return (
          item.qr_code.toLocaleLowerCase() ===
            codigoBuscado ||
          item.id.toLocaleLowerCase() ===
            codigoBuscado
        );
      }) ?? null;

    this.codigoManual.set(codigo);
    this.entradaEncontrada.set(entrada);

    if (this.scannerActivo()) {
      this.detenerScanner();
    }

    if (!entrada) {
      this.mensajeError.set(
        'El código no corresponde a ninguna entrada registrada.'
      );

      return;
    }

    if (entrada.estado === 'valida') {
      this.mensajeExito.set(
        'Entrada encontrada. Verificá los datos antes de validarla.'
      );

      return;
    }

    if (entrada.estado === 'usada') {
      this.mensajeError.set(
        'Esta entrada ya fue utilizada.'
      );

      return;
    }

    this.mensajeError.set(
      'Esta entrada fue cancelada y no puede utilizarse.'
    );
  }

  detenerScanner() {
    this.controlesScanner?.stop();
    this.controlesScanner = undefined;

    const video =
      this.videoScanner?.nativeElement;

    if (video?.srcObject) {
      const stream =
        video.srcObject as MediaStream;

      stream.getTracks().forEach(track => {
        track.stop();
      });

      video.srcObject = null;
    }

    this.scannerActivo.set(false);
    this.iniciandoScanner.set(false);
    this.mensajeScanner.set('');
  }

  async validarEntrada() {
    const entrada = this.entradaEncontrada();

    if (
      !entrada ||
      entrada.estado !== 'valida' ||
      this.validando()
    ) {
      return;
    }

    const confirmada = window.confirm(
      `¿Confirmar el ingreso para "${entrada.funciones.peliculas.titulo}"?`
    );

    if (!confirmada) {
      return;
    }

    this.validando.set(true);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    const resultado =
      await this.adminEntradas.marcarComoUsada(
        entrada.id
      );

    if (resultado.error) {
      console.error(resultado.error);

      this.mensajeError.set(
        resultado.error.message
      );

      this.validando.set(false);
      return;
    }

    const entradaActualizada: EntradaAdmin = {
      ...entrada,
      estado: 'usada'
    };

    this.entradas.update(entradas => {
      return entradas.map(item => {
        if (item.id === entrada.id) {
          return entradaActualizada;
        }

        return item;
      });
    });

    this.entradaEncontrada.set(
      entradaActualizada
    );

    this.mensajeExito.set(
      'Ingreso autorizado. La entrada fue marcada como utilizada.'
    );

    this.validando.set(false);
  }

  limpiarResultado() {
    this.codigoManual.set('');
    this.entradaEncontrada.set(null);
    this.mensajeError.set('');
    this.mensajeExito.set('');
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
        dateStyle: 'long',
        timeStyle: 'short'
      }
    ).format(new Date(fecha));
  }
}         