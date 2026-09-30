import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormRecord, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FuncionDetalle } from '../../core/models/funcion.interface';
import { ProductoSeleccionadoCompra } from '../../core/models/producto-compra.interface';
import { Producto } from '../../core/models/producto.interface';
import { AuthService } from '../../core/services/auth.service';
import { ButacasService } from '../../core/services/butacas.service';
import { CarritoService } from '../../core/services/carrito.service';
import { ComprasService } from '../../core/services/compras.service';
import { ProductosService } from '../../core/services/productos.service';

@Component({
  imports: [
    DatePipe,
    ReactiveFormsModule
  ],
  selector: 'app-compra',
  styleUrl: './compra.css',
  templateUrl: './compra.html'
})
export class Compra implements OnInit {
  carrito = inject(CarritoService);

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private butacasService = inject(ButacasService);
  private comprasService = inject(ComprasService);
  private authService = inject(AuthService);
  private productosService = inject(ProductosService);

  funcionId = '';

  datosFuncion =
    signal<FuncionDetalle | null>(null);

  productosCandy =
    signal<Producto[]>([]);

  formularioProductos =
    new FormRecord<FormControl<number>>({});

  creditoDisponible = signal(0);
  usarCredito = signal(false);

  procesando = signal(false);
  mensajeError = signal('');

  compraConfirmada =
    signal<string | null>(null);

  async ngOnInit() {
    this.funcionId =
      this.route.snapshot.paramMap.get(
        'funcionId'
      )!;

    if (
      this.carrito.butacasParaComprar().size === 0
    ) {
      await this.router.navigate([
        '/funcion',
        this.funcionId,
        'butacas'
      ]);

      return;
    }

    const { data, error } =
      await this.butacasService.getFuncion(
        this.funcionId
      );

    if (error) {
      this.mensajeError.set(
        'No se pudo cargar la función'
      );

      return;
    }

    if (data) {
      this.datosFuncion.set(
        data as unknown as FuncionDetalle
      );
    }

    await this.cargarCredito();
    await this.cargarProductosCandy();
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

    this.creditoDisponible.set(
      Number(data?.credito ?? 0)
    );
  }

  private async cargarProductosCandy() {
    const { data, error } =
      await this.productosService
        .obtenerProductosCandy();

    if (error) {
      console.error(error);

      this.mensajeError.set(
        'No se pudieron cargar los productos del Candy Bar.'
      );

      return;
    }

    const productos =
      (data ?? []) as unknown as Producto[];

    this.productosCandy.set(productos);

    for (const producto of productos) {
      this.formularioProductos.addControl(
        producto.id,
        new FormControl(
          0,
          {
            nonNullable: true,
            validators: [
              Validators.min(0),
              Validators.max(20)
            ]
          }
        )
      );
    }
  }

  cambiarUsoCredito() {
    this.usarCredito.update(
      valor => !valor
    );
  }

  cantidadProducto(productoId: string) {
    return (
      this.formularioProductos
        .controls[productoId]?.value ?? 0
    );
  }

  aumentarProducto(productoId: string) {
    const control =
      this.formularioProductos
        .controls[productoId];

    if (!control || control.value >= 20) {
      return;
    }

    control.setValue(control.value + 1);
  }

  disminuirProducto(productoId: string) {
    const control =
      this.formularioProductos
        .controls[productoId];

    if (!control || control.value <= 0) {
      return;
    }

    control.setValue(control.value - 1);
  }

  subtotalEntradas() {
    const funcion = this.datosFuncion();

    if (!funcion) {
      return 0;
    }

    return this.carrito.calcularTotal(
      funcion.precio,
      funcion.precio_vip
    );
  }

  subtotalProductos() {
    return this.productosCandy().reduce(
      (total, producto) => {
        const cantidad =
          this.cantidadProducto(
            producto.id
          );

        return (
          total +
          Number(producto.precio) *
          cantidad
        );
      },
      0
    );
  }

  subtotalCompra() {
    return (
      this.subtotalEntradas() +
      this.subtotalProductos()
    );
  }

  creditoAplicado() {
    if (!this.usarCredito()) {
      return 0;
    }

    return Math.min(
      this.creditoDisponible(),
      this.subtotalCompra()
    );
  }

  totalAPagar() {
    return (
      this.subtotalCompra() -
      this.creditoAplicado()
    );
  }

  productosSeleccionados():
    ProductoSeleccionadoCompra[] {
    return this.productosCandy()
      .filter(
        producto =>
          this.cantidadProducto(
            producto.id
          ) > 0
      )
      .map(
        producto => ({
          producto_id: producto.id,
          cantidad:
            this.cantidadProducto(
              producto.id
            )
        })
      );
  }

  formatearPrecio(valor: number) {
    return new Intl.NumberFormat(
      'es-AR',
      {
        style: 'currency',
        currency: 'ARS'
      }
    ).format(valor);
  }

  async confirmarCompra() {
    if (this.procesando()) {
      return;
    }

    if (this.formularioProductos.invalid) {
      this.mensajeError.set(
        'Revisá las cantidades de los productos.'
      );

      return;
    }

    const butacaIds = this.carrito
      .butacasSeleccionadas()
      .map(butaca => butaca.id);

    if (butacaIds.length === 0) {
      this.mensajeError.set(
        'No seleccionaste ninguna butaca'
      );

      return;
    }

    this.procesando.set(true);
    this.mensajeError.set('');

    const { data, error } =
      await this.comprasService.confirmarCompra(
        this.funcionId,
        butacaIds,
        this.usarCredito(),
        this.productosSeleccionados()
      );

    if (error) {
      this.mensajeError.set(
        error.message
      );

      this.procesando.set(false);
      return;
    }

    this.compraConfirmada.set(data);
    this.carrito.vaciarCarrito();
    this.procesando.set(false);
  }
}