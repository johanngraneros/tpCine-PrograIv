import { Component, OnInit, inject, signal } from '@angular/core';
import { Canje, Producto } from '../../core/models/producto.interface';
import { AuthService } from '../../core/services/auth.service';
import { ProductosService } from '../../core/services/productos.service';
import { traducirError } from '../../core/services/supabase.service';

@Component({
  imports: [],
  selector: 'app-beneficios',
  styleUrl: './beneficios.css',
  templateUrl: './beneficios.html',
})
export class Beneficios implements OnInit {
  private authService = inject(AuthService);
  private productosService = inject(ProductosService);

  productos = signal<Producto[]>([]);
  canjes = signal<Canje[]>([]);
  puntos = signal(0);

  cargando = signal(true);
  canjeandoId = signal<string | null>(null);
  confirmandoCanjeId = signal<string | null>(null);

  mensajeError = signal('');
  mensajeExito = signal('');

  ngOnInit() {
    void this.cargarDatos();
  }

  async cargarDatos() {
    this.cargando.set(true);
    this.mensajeError.set('');

    await Promise.all([
      this.cargarProductos(),
      this.cargarPerfil(),
      this.cargarCanjes()
    ]);

    this.cargando.set(false);
  }

  private async cargarProductos() {
    const { data, error } =
      await this.productosService.obtenerProductos();

    if (error) {
      console.error(error);
      this.mensajeError.set(
        'No se pudieron cargar los productos'
      );
      return;
    }

    this.productos.set(
      (data ?? []) as unknown as Producto[]
    );
  }

  private async cargarPerfil() {
    const usuario = this.authService.currentUser();

    if (!usuario) {
      this.puntos.set(0);
      return;
    }

    const { data, error } =
      await this.authService.getPerfil(usuario.id);

    if (error) {
      console.error(error);
      this.mensajeError.set(
        'No se pudieron cargar tus puntos'
      );
      return;
    }

    this.puntos.set(
      Number(data?.puntos ?? 0)
    );
  }

  private async cargarCanjes() {
    const usuario = this.authService.currentUser();

    if (!usuario) {
      this.canjes.set([]);
      return;
    }

    const { data, error } =
      await this.productosService
        .obtenerMisCanjes(usuario.id);

    if (error) {
      console.error(error);
      this.mensajeError.set(
        'No se pudo cargar el historial de canjes'
      );
      return;
    }

    this.canjes.set(
      (data ?? []) as unknown as Canje[]
    );
  }

  puedeCanjear(producto: Producto) {
    if (producto.costo_puntos === null) {
      return false;
    }

    return this.puntos() >= producto.costo_puntos;
  }

  async canjearProducto(producto: Producto) {
    if (
      producto.costo_puntos === null ||
      !this.puedeCanjear(producto) ||
      this.canjeandoId() !== null
    ) {
      return;
    }

    if (this.confirmandoCanjeId() !== producto.id) {
      this.confirmandoCanjeId.set(producto.id);
      return;
    }
    this.confirmandoCanjeId.set(null);

    this.canjeandoId.set(producto.id);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    const { error } =
      await this.productosService
        .canjearProducto(producto.id);

    if (error) {
      console.error(error);
      this.mensajeError.set(traducirError(error, 'No se pudo realizar el canje. Intentá nuevamente.'));
      this.canjeandoId.set(null);
      return;
    }

    await Promise.all([
      this.cargarPerfil(),
      this.cargarCanjes()
    ]);

    this.mensajeExito.set(
      `Canjeaste "${producto.nombre}" correctamente.`
    );

    this.canjeandoId.set(null);
  }

  formatearPrecio(valor: number) {
    return new Intl.NumberFormat(
      'es-AR',
      {
        style: 'currency',
        currency: 'ARS'
      }
    ).format(Number(valor));
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
