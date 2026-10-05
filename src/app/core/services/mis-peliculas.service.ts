import { Injectable, inject } from '@angular/core';
import { MisComprasService } from './mis-compras.service';
import { Supabase } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class MisPeliculasService {
  private misComprasService = inject(MisComprasService);
  private supabase = inject(Supabase);

  async obtenerHistorial(usuarioId: string) {
    const [compras, resenas] = await Promise.all([
      this.misComprasService.obtenerMisCompras(usuarioId),
      this.supabase.instance
        .from('resenas')
        .select('pelicula_id, estrellas, comentario, fecha')
        .eq('usuario_id', usuarioId)
    ]);

    return {
      compras,
      resenas
    };
  }
}
