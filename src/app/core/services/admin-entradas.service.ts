import {
  Injectable,
  inject
} from '@angular/core';

import {
  Supabase
} from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AdminEntradasService {
  private supabase = inject(Supabase);

  obtenerEntradas() {
    return this.supabase.instance
      .from('entradas')
      .select(`
        id,
        compra_id,
        funcion_id,
        butaca_id,
        qr_code,
        estado,
        compras (
          id,
          fecha,
          estado,
          perfiles (
            id,
            nombre,
            apellido
          )
        ),
        butacas (
          id,
          fila,
          numero,
          tipo
        ),
        funciones (
          id,
          fecha_hora,
          peliculas (
            id,
            titulo
          ),
          salas (
            id,
            nombre
          )
        )
      `)
      .order('id', {
        ascending: false
      });
  }

  marcarComoUsada(
    entradaId: string
  ) {
    return this.supabase.instance.rpc(
      'marcar_entrada_usada',
      {
        p_entrada_id: entradaId
      }
    );
  }
}