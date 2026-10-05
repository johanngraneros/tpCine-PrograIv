import { DatePipe } from '@angular/common';
import { Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { EntregaCandy } from '../../core/models/entrega-candy.interface';
import { ControlCandyService } from '../../core/services/control-candy.service';

@Component({
  selector: 'app-control-candy',
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './control-candy.html',
  styleUrl: './control-candy.css'
})
export class ControlCandy implements OnDestroy {
  @ViewChild('videoScanner') private videoScanner?: ElementRef<HTMLVideoElement>;
  private servicio = inject(ControlCandyService);
  private lector = new BrowserQRCodeReader();
  private controles?: IScannerControls;

  codigo = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  entrega = signal<EntregaCandy | null>(null);
  buscando = signal(false);
  entregando = signal(false);
  scannerActivo = signal(false);
  mensajeError = signal('');
  mensajeExito = signal('');

  ngOnDestroy() {
    this.detenerScanner();
  }

  async buscar() {
    this.codigo.markAsTouched();
    if (this.codigo.invalid || this.buscando()) return;

    const codigo = this.limpiarCodigo(this.codigo.value);
    this.codigo.setValue(codigo);
    this.buscando.set(true);
    this.entrega.set(null);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    try {
      const { data, error } = await this.servicio.buscarPorCodigo(codigo);
      if (error || !data) {
        this.mensajeError.set(error?.message ?? 'No existe una compra con ese código.');
      } else {
        const pedido = data as unknown as EntregaCandy;
        this.entrega.set(pedido);
        if (this.items(pedido).length === 0) {
          this.mensajeError.set('La compra no incluye productos del Candy Bar.');
        } else if (this.estadoPedido(pedido) === 'cancelado') {
          this.mensajeError.set('Este pedido fue cancelado.');
        } else if (!this.puedeEntregar(pedido)) {
          this.mensajeExito.set('Este pedido ya fue entregado.');
        }
      }
    } catch {
      this.mensajeError.set('No se pudo consultar el pedido. Intentá nuevamente.');
    } finally {
      this.buscando.set(false);
    }
  }

  async alternarScanner() {
    if (this.scannerActivo()) {
      this.detenerScanner();
      return;
    }
    this.scannerActivo.set(true);
    setTimeout(() => void this.iniciarScanner());
  }

  private async iniciarScanner() {
    const video = this.videoScanner?.nativeElement;
    if (!video) return;
    try {
      this.controles = await this.lector.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: 'environment' } } },
        video,
        result => {
          if (!result) return;
          this.codigo.setValue(this.limpiarCodigo(result.getText()));
          this.detenerScanner();
          void this.buscar();
        }
      );
    } catch {
      this.mensajeError.set('No se pudo abrir la cámara. Revisá el permiso del navegador.');
      this.detenerScanner();
    }
  }

  detenerScanner() {
    this.controles?.stop();
    this.controles = undefined;
    this.scannerActivo.set(false);
  }

  items(entrega: EntregaCandy) {
    return [
      ...(entrega.compra_productos ?? []),
      ...(entrega.compra_combos ?? [])
    ];
  }

  nombreItem(item: EntregaCandy['compra_productos'][number]) {
    return item.productos?.nombre ?? item.combos?.nombre ?? 'Producto';
  }

  puedeEntregar(entrega: EntregaCandy) {
    const items = this.items(entrega);
    return items.length > 0 && items.some(item => item.estado === 'valida');
  }

  estadoPedido(entrega: EntregaCandy): 'pendiente' | 'entregado' | 'cancelado' {
    const items = this.items(entrega);
    if (items.some(item => item.estado === 'valida')) return 'pendiente';
    if (items.length > 0 && items.every(item => item.estado === 'cancelada')) {
      return 'cancelado';
    }
    return 'entregado';
  }

  async confirmarEntrega() {
    const entrega = this.entrega();
    if (!entrega || !this.puedeEntregar(entrega) || this.entregando()) return;
    if (!window.confirm('¿Confirmar la entrega de todos los productos pendientes?')) return;

    this.entregando.set(true);
    const { error } = await this.servicio.marcarEntregado(entrega.qr_code);
    if (error) {
      this.mensajeError.set(error.message);
    } else {
      this.mensajeExito.set('Entrega confirmada.');
      await this.buscar();
      this.mensajeExito.set('Entrega confirmada.');
    }
    this.entregando.set(false);
  }

  private limpiarCodigo(valor: string) {
    return valor.trim().replace(/^CINEIZE:/i, '');
  }
}
