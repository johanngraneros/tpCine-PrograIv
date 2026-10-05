import { Injectable, inject } from '@angular/core';
import { Supabase } from './supabase.service';

export interface ButacaSalaAdmin {
  id: string;
  fila: string;
  numero: number;
  tipo: 'normal' | 'vip' | 'accesible';
}

export interface SalaAdmin {
  id: string;
  nombre: string;
  butacas: ButacaSalaAdmin[];
}

@Injectable({ providedIn: 'root' })
export class AdminSalasService {
  private supabase = inject(Supabase);

  obtenerSalas() {
    return this.supabase.instance
      .from('salas')
      .select('id, nombre, butacas(id, fila, numero, tipo)')
      .order('nombre');
  }

  crearSala(nombre: string) {
    return this.supabase.instance.rpc('crear_sala_con_distribucion', {
      p_nombre: nombre
    });
  }

  cambiarTipoButaca(butacaId: string, tipo: ButacaSalaAdmin['tipo']) {
    return this.supabase.instance.rpc('actualizar_tipo_butaca', {
      p_butaca_id: butacaId,
      p_tipo: tipo
    });
  }
}
