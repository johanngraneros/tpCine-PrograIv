import { inject, Injectable } from '@angular/core';
import { Supabase } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class ComprasService {
  private supabase = inject(Supabase);

  confirmarCompra(funcionId: string, butacaIds: string[]) { //puente entre Angular y la función SQL confirmar_compra
    return this.supabase.instance.rpc('confirmar_compra', {
      p_funcion_id: funcionId, //el ID de la función de cine.
      p_butaca_ids: butacaIds //butacaIds: un arreglo con los IDs de las butacas seleccionadas.

    //funcionId = '0a222...';
    //butacaIds = ['id-butaca-1', 'id-butaca-2'];
    //     {
    // p_funcion_id: funcionId,
    // p_butaca_ids: butacaIds
    // }
    //A la izquierda están los nombres definidos en PostgreSQL; a la derecha, los valores recibidos en TypeScript:
    
    //rpc Remote Procedure Call.
    });
  }
}