import { Injectable, inject} from '@angular/core';
import { Supabase } from '../services/supabase.service';
import type { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({  
  providedIn: 'root'
})
export class ButacasService {
    private supabase = inject(Supabase);
    
    async getFuncion(funcionId: string) {
        const { data, error } = await this.supabase.instance
        .from('funciones')
        .select('*, salas(nombre, id), peliculas(titulo)') //joins a salas y peliculas
        .eq('id', funcionId) //where id  = funcionId
        .single(); // pa q data llegue como obj directo en vez de array
        return { data, error };
  }

    async getButacasDeSalas(salaId: string) {
        const { data, error } = await this.supabase.instance
        .from('butacas')
        .select('*') //select all columns
        .eq('sala_id', salaId) //where sala_id  = salaId
        .order('fila')
        .order('numero')
        return { data, error };
  }

    async getButacasOcupadas(funcionId: string) {
        return this.supabase.instance.rpc(
            'obtener_butacas_ocupadas',
            {
            p_funcion_id: funcionId
            }
        );
    }

  suscribirCambios(
    funcionId: string,
    onCambio: () => void
        ): RealtimeChannel {
        const canal = this.supabase.instance
            .channel(`funcion:${funcionId}`)
            .on(
            'broadcast',
            {
                event: 'ocupacion_cambio'
            },
            () => {
                onCambio();
            }
            )
            .subscribe();

        return canal;
    }

    cerrarCanal(canal: RealtimeChannel) {
        this.supabase.instance.removeChannel(canal);
    }

}

