import { signal, Injectable, inject } from '@angular/core';

@Injectable({  
  providedIn: 'root'
})
export class CarritoService {
    butacasParaComprar = signal<Map<string, any>>(new Map());

    toggleButacaComprada(butaca: any) {

        const seleccion = new Map(this.butacasParaComprar());
        if (seleccion.has(butaca.id)) {
            seleccion.delete(butaca.id);
        } else {
            seleccion.set(butaca.id, butaca);
        }
        this.butacasParaComprar.set(seleccion);
    }

    calcularTotal (precioNormal : number , precioVip : number) : number {
        let total = 0;
          this.butacasParaComprar().forEach((butaca) => {
            if (butaca.tipo === 'vip') {
            total += precioVip;
            } else {
            total += precioNormal;
            }
        });

        return total;
    }
}
