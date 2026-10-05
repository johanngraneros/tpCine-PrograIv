import { Injectable, inject } from '@angular/core';
import { Supabase } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class MisComprasService {
  private supabase = inject(Supabase);

  obtenerMisCompras(usuarioId: string) {
    return this.supabase.instance
      .from('compras')
      .select(`
        id,
        fecha,
        subtotal,
        descuento,
        credito_usado,
        total,
        estado,
        puntos_ganados,
        qr_code,
        compra_productos (
          id, cantidad, estado,
          productos ( nombre )
        ),
        compra_combos (
          id, cantidad, estado,
          combos ( nombre )
        ),
        entradas (
          id,
          qr_code,
          estado,
          funciones (
            id,
            fecha_hora,
            peliculas (
              id,
              titulo,
              imagen_url
            ),
            salas (
              id,
              nombre
            )
          ),
          butacas (
            id,
            fila,
            numero,
            tipo
          )
        )
      `)
      .eq('usuario_id', usuarioId)
      .order('fecha', {
        ascending: false
      });
  }

  cancelarMiCompra(compraId: string) {
    return this.supabase.instance.rpc(
      'cancelar_mi_compra',
      {
        p_compra_id: compraId
      }
    );
  }
}
