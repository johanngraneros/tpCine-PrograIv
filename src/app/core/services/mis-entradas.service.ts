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
export class MisEntradasService {
  private supabase = inject(Supabase);

  obtenerMisEntradas() {
    return this.supabase.instance
      .from('entradas')
      .select(`
        id,
        compra_id,
        qr_code,
        estado,
        compras (
            id,
            fecha,
            estado,
            total,
            perfiles (
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
            titulo,
            imagen_url
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
}