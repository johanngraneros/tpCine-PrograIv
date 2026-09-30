import { Injectable, inject } from '@angular/core';
import { Supabase } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class ControlCanjesService {
  private supabase = inject(Supabase);

  buscarPorCodigo(codigo: string) {
    return this.supabase.instance
      .from('canjes')
      .select(`
        id,
        usuario_id,
        producto_id,
        puntos_utilizados,
        codigo,
        estado,
        created_at,
        utilizado_at,
        validado_por,
        productos (
          id,
          nombre,
          descripcion,
          imagen_url,
          costo_puntos,
          categorias_productos (
            nombre
          )
        ),
        perfiles!canjes_usuario_id_fkey (
          id,
          nombre,
          apellido
        )
      `)
      .eq('codigo', codigo)
      .maybeSingle();
  }

  marcarComoUtilizado(canjeId: string) {
    return this.supabase.instance.rpc(
      'marcar_canje_utilizado',
      {
        p_canje_id: canjeId
      }
    );
  }
}