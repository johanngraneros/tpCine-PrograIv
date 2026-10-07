import { Injectable, inject } from '@angular/core';
import { ComboSeleccionadoCompra } from '../models/combo.interface';
import { ProductoSeleccionadoCompra } from '../models/producto-compra.interface';
import { Supabase } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class ComprasService {
  private supabase = inject(Supabase);

  obtenerCuponDisponible() {
    return this.supabase.instance.rpc(
      'obtener_cupon_disponible'
    );
  }

  confirmarCompra(
    funcionId: string,
    butacaIds: string[],
    usarCredito: boolean,
    productos: ProductoSeleccionadoCompra[] = [],
    combos: ComboSeleccionadoCompra[] = []
  ) {
    return this.supabase.instance.rpc(
      'confirmar_compra',
      {
        p_funcion_id: funcionId,
        p_butaca_ids: butacaIds,
        p_usar_credito: usarCredito,
        p_productos: productos,
        p_combos: combos
      }
    );
  }

  confirmarCompraConCanjes(
    funcionId: string,
    butacaIds: string[],
    canjesIds: string[],
    usarCredito: boolean,
    productos: ProductoSeleccionadoCompra[] = [],
    combos: ComboSeleccionadoCompra[] = []
  ) {
    return this.supabase.instance.rpc(
      'confirmar_compra_con_beneficios_valorados',
      {
        p_funcion_id: funcionId,
        p_butaca_ids: butacaIds,
        p_usar_credito: usarCredito,
        p_productos: productos,
        p_combos: combos,
        p_canje_ids: canjesIds
      }
    );
  }

  confirmarCompraInvitado(
    funcionId: string,
    butacaIds: string[],
    nombre: string,
    email: string,
    fechaNacimiento: string,
    productos: ProductoSeleccionadoCompra[] = [],
    combos: ComboSeleccionadoCompra[] = []
  ) {
    return this.supabase.instance.rpc(
      'confirmar_compra_invitado',
      {
        p_funcion_id: funcionId,
        p_butaca_ids: butacaIds,
        p_nombre: nombre,
        p_email: email,
        p_fecha_nacimiento: fechaNacimiento,
        p_productos: productos,
        p_combos: combos
      }
    );
  }

  obtenerEntradasInvitado(compraId: string, email: string) {
    return this.supabase.instance.rpc('obtener_entradas_invitado', {
      p_compra_id: compraId,
      p_email: email
    });
  }

  confirmarCompraCandy(
    usarCredito: boolean,
    productos: ProductoSeleccionadoCompra[] = [],
    combos: ComboSeleccionadoCompra[] = []
  ) {
    return this.supabase.instance.rpc(
      'confirmar_compra_candy',
      {
        p_usar_credito: usarCredito,
        p_productos: productos,
        p_combos: combos
      }
    );
  }
}
