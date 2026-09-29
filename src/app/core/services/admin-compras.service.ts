import {
  Injectable,
  inject
} from '@angular/core';

import { Supabase } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AdminComprasService {
  private supabase = inject(Supabase);

  obtenerCompras() {
    return this.supabase.instance
      .from('compras')
      .select(`
        id,
        usuario_id,
        fecha,
        subtotal,
        descuento,
        credito_usado,
        total,
        estado,
        puntos_ganados,
        perfiles (
          id,
          nombre,
          apellido
        ),
        entradas (
          id,
          qr_code,
          estado,
          butacas (
            fila,
            numero,
            tipo
          ),
          funciones (
            id,
            fecha_hora,
            peliculas (
              titulo
            ),
            salas (
              nombre
            )
          )
        )
      `)
      .order('fecha', {
        ascending: false
      });
  }

  cancelarCompra(compraId: string) {
    return this.supabase.instance.rpc(
      'cancelar_compra',
      {
        p_compra_id: compraId
      }
    );
  }
}