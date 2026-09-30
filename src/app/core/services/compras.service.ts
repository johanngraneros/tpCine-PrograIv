import { Injectable, inject } from '@angular/core';
import { ProductoSeleccionadoCompra } from '../models/producto-compra.interface';
import { Supabase } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class ComprasService {
  private supabase = inject(Supabase);

  confirmarCompra(
    funcionId: string,
    butacaIds: string[],
    usarCredito: boolean,
    productos: ProductoSeleccionadoCompra[] = []
  ) {
    return this.supabase.instance.rpc(
      'confirmar_compra',
      {
        p_funcion_id: funcionId,
        p_butaca_ids: butacaIds,
        p_usar_credito: usarCredito,
        p_productos: productos
      }
    );
  }
}