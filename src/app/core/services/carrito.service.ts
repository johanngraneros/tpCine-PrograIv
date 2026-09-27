import {computed, Injectable, signal } from '@angular/core';
import { Butaca } from '../models/butaca.interface';

@Injectable({
  providedIn: 'root'
})

export class CarritoService {
  butacasParaComprar = signal<Map<string, Butaca>>(new Map());

  butacasSeleccionadas = computed(() =>
    Array.from(this.butacasParaComprar().values())
  );

  toggleButacaComprada(butaca: Butaca) {
    const seleccion =
      new Map(this.butacasParaComprar());

    if (seleccion.has(butaca.id)) {
      seleccion.delete(butaca.id);
    } else {
      seleccion.set(butaca.id, butaca);
    }

    this.butacasParaComprar.set(seleccion);
  }

  calcularTotal(
    precioNormal: number,
    precioVip: number | null
  ): number {
    let total = 0;

    this.butacasParaComprar().forEach(butaca => {
      if (butaca.tipo === 'vip') {
        total += precioVip ?? precioNormal;
      } else {
        total += precioNormal;
      }
    });

    return total;
  }

  vaciarCarrito() {
    this.butacasParaComprar.set(new Map());
  }
}