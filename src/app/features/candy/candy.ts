import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormRecord, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Combo, ComboSeleccionadoCompra } from '../../core/models/combo.interface';
import { ProductoSeleccionadoCompra } from '../../core/models/producto-compra.interface';
import { Producto } from '../../core/models/producto.interface';
import { AuthService } from '../../core/services/auth.service';
import { CombosService } from '../../core/services/combos.service';
import { ComprasService } from '../../core/services/compras.service';
import { ProductosService } from '../../core/services/productos.service';

type SeccionCandy = 'Pochoclos' | 'Bebidas' | 'Snacks' | 'Combos';

@Component({
  selector: 'app-candy',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './candy.html',
  styleUrl: './candy.css'
})
export class Candy implements OnInit {
  private productosService = inject(ProductosService);
  private combosService = inject(CombosService);
  private comprasService = inject(ComprasService);
  private authService = inject(AuthService);

  readonly secciones: SeccionCandy[] = ['Pochoclos', 'Bebidas', 'Snacks', 'Combos'];
  seccionActiva = signal<SeccionCandy>('Pochoclos');
  productos = signal<Producto[]>([]);
  combos = signal<Combo[]>([]);
  cargando = signal(true);
  procesando = signal(false);
  mensajeError = signal('');
  compraConfirmada = signal<string | null>(null);
  creditoDisponible = signal(0);
  usarCredito = new FormControl(false, { nonNullable: true });

  cantidadesProductos = new FormRecord<FormControl<number>>({});
  cantidadesCombos = new FormRecord<FormControl<number>>({});

  async ngOnInit() {
    await Promise.all([
      this.cargarCatalogo(),
      this.cargarCredito()
    ]);
    this.cargando.set(false);
  }

  private async cargarCatalogo() {
    const [resultadoProductos, resultadoCombos] = await Promise.all([
      this.productosService.obtenerProductosCandy(),
      this.combosService.obtenerCombos()
    ]);

    if (resultadoProductos.error || resultadoCombos.error) {
      console.error(resultadoProductos.error ?? resultadoCombos.error);
      this.mensajeError.set('No se pudo cargar el catálogo de Candy. Intentá nuevamente.');
      return;
    }

    const productos = (resultadoProductos.data ?? []) as unknown as Producto[];
    const combos = (resultadoCombos.data ?? []) as Combo[];
    this.productos.set(productos);
    this.combos.set(combos);

    for (const producto of productos) {
      this.cantidadesProductos.addControl(producto.id, this.controlCantidad(20));
    }
    for (const combo of combos) {
      this.cantidadesCombos.addControl(combo.id, this.controlCantidad(10));
    }
  }

  private controlCantidad(maximo: number) {
    return new FormControl(0, {
      nonNullable: true,
      validators: [Validators.min(0), Validators.max(maximo)]
    });
  }

  private async cargarCredito() {
    const usuario = this.authService.currentUser();
    if (!usuario) return;
    const { data } = await this.authService.getPerfil(usuario.id);
    this.creditoDisponible.set(Number(data?.credito ?? 0));
  }

  productosVisibles() {
    if (this.seccionActiva() === 'Combos') return [];
    return this.productos().filter(producto =>
      producto.categorias_productos?.nombre.toLowerCase() === this.seccionActiva().toLowerCase()
    );
  }

  cantidadProducto(id: string) {
    return this.cantidadesProductos.controls[id]?.value ?? 0;
  }

  cantidadCombo(id: string) {
    return this.cantidadesCombos.controls[id]?.value ?? 0;
  }

  cambiarProducto(id: string, cambio: number) {
    const control = this.cantidadesProductos.controls[id];
    if (control) control.setValue(Math.max(0, Math.min(20, control.value + cambio)));
  }

  cambiarCombo(id: string, cambio: number) {
    const control = this.cantidadesCombos.controls[id];
    if (control) control.setValue(Math.max(0, Math.min(10, control.value + cambio)));
  }

  productosSeleccionados(): ProductoSeleccionadoCompra[] {
    return this.productos()
      .filter(producto => this.cantidadProducto(producto.id) > 0)
      .map(producto => ({
        producto_id: producto.id,
        cantidad: this.cantidadProducto(producto.id)
      }));
  }

  combosSeleccionados(): ComboSeleccionadoCompra[] {
    return this.combos()
      .filter(combo => this.cantidadCombo(combo.id) > 0)
      .map(combo => ({
        combo_id: combo.id,
        cantidad: this.cantidadCombo(combo.id)
      }));
  }

  cantidadTotal() {
    return this.productosSeleccionados().reduce((total, item) => total + item.cantidad, 0) +
      this.combosSeleccionados().reduce((total, item) => total + item.cantidad, 0);
  }

  subtotal() {
    const productos = this.productos().reduce((total, producto) =>
      total + Number(producto.precio) * this.cantidadProducto(producto.id), 0);
    const combos = this.combos().reduce((total, combo) =>
      total + Number(combo.precio_fijo) * this.cantidadCombo(combo.id), 0);
    return productos + combos;
  }

  creditoAplicado() {
    return this.usarCredito.value
      ? Math.min(this.creditoDisponible(), this.subtotal())
      : 0;
  }

  total() {
    return this.subtotal() - this.creditoAplicado();
  }

  formatearPrecio(valor: number) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS'
    }).format(valor);
  }

  async confirmarCompra() {
    if (this.procesando() || this.cantidadTotal() === 0) return;
    if (this.cantidadesProductos.invalid || this.cantidadesCombos.invalid) {
      this.mensajeError.set('Revisá las cantidades elegidas.');
      return;
    }

    this.procesando.set(true);
    this.mensajeError.set('');
    const { data, error } = await this.comprasService.confirmarCompraCandy(
      this.usarCredito.value,
      this.productosSeleccionados(),
      this.combosSeleccionados()
    );

    if (error) {
      this.mensajeError.set(error.message);
      this.procesando.set(false);
      return;
    }

    this.compraConfirmada.set(data as string);
    this.procesando.set(false);
  }
}
