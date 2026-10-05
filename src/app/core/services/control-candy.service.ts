import { Injectable, inject } from '@angular/core';
import { Supabase } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class ControlCandyService {
  private supabase = inject(Supabase);

  buscarPorCodigo(codigo: string) {
    return this.supabase.instance.rpc('buscar_pedido_candy', {
      p_codigo: codigo
    });
  }

  marcarEntregado(codigo: string) {
    return this.supabase.instance.rpc('marcar_candy_entregado', {
      p_codigo: codigo
    });
  }
}
