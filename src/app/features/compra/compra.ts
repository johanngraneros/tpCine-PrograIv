import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButacasService } from '../../core/services/butacas.service';
import { CarritoService } from '../../core/services/carrito.service';
import { ComprasService } from '../../core/services/compras.service';
import { FuncionDetalle} from '../../core/models/funcion.interface';

@Component({
  imports: [],
  selector: 'app-compra',
  styleUrl: './compra.css',
  templateUrl: './compra.html',
})
export class Compra implements OnInit {
  carrito = inject(CarritoService);

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private butacasService = inject(ButacasService);
  private comprasService = inject(ComprasService);

  funcionId = '';
  datosFuncion = signal<FuncionDetalle | null>(null);

  procesando = signal(false);
  mensajeError = signal('');
  compraConfirmada = signal<string | null>(null);

  async ngOnInit() {
    this.funcionId = this.route.snapshot.paramMap.get('funcionId')!;
     //primero leemos funcionId porque lo necesitamos para construir esta dirección: ['/funcion', this.funcionId, 'butacas']

    if (this.carrito.butacasParaComprar().size === 0) {
      await this.router.navigate([
        '/funcion',
        this.funcionId,
        'butacas'
      ]);
      return;
    }

    const { data, error } =
      await this.butacasService.getFuncion(this.funcionId);

    if (error) {
      this.mensajeError.set('No se pudo cargar la función');
      return;
    }

  if (data) {
    this.datosFuncion.set(
      data as unknown as FuncionDetalle
    );
  }
  }

  async confirmarCompra() {
    if (this.procesando()) return;

    const butacaIds = this.carrito
      .butacasSeleccionadas()
      .map(butaca => butaca.id);

    if (butacaIds.length === 0) {
      this.mensajeError.set('No seleccionaste ninguna butaca');
      return;
    }

    this.procesando.set(true);
    this.mensajeError.set('');

    const { data, error } =
      await this.comprasService.confirmarCompra(
        this.funcionId,
        butacaIds
      );

    if (error) {
      this.mensajeError.set(error.message);
      this.procesando.set(false);
      return;
    }

    this.compraConfirmada.set(data);
    this.carrito.vaciarCarrito();
    this.procesando.set(false);
  }
}