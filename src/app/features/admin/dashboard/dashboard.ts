import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminComprasService } from '../../../core/services/admin-compras.service';

@Component({ selector: 'app-dashboard', imports: [RouterLink], templateUrl: './dashboard.html', styleUrl: './dashboard.css' })
export class Dashboard implements OnInit {
  private servicio = inject(AdminComprasService);
  productoMasVendido = signal<{ id: string; nombre: string; cantidad: number } | null>(null);
  cargandoEstadistica = signal(true);
  errorProducto = signal('');

  async ngOnInit() {
    const { data, error } = await this.servicio.obtenerProductoCandyMasVendido();
    if (error) this.errorProducto.set('No se pudo calcular el producto más vendido.');
    else this.productoMasVendido.set(data);
    this.cargandoEstadistica.set(false);
  }
}
