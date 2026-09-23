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
        const { data, error } = await this.supabase.instance
        .from('entradas')
        .select(' butaca_id ') 
        .neq('estado', 'cancelada') //where estado != 'cancelada'
        .eq('funcion_id', funcionId) //where funcion_id  = funcionId      
        return { data, error };
  }

  suscribirCambios(funcionId: string, onCambio: () => void) {
    
    const canal = this.supabase.instance.channel(`butacas-funcion-${funcionId}`).on('postgres_changes', { //"quiero escuchar cambios de la base de datos"
        event: '*', //que cambios te interesan
        schema: 'public',
        table: 'entradas',
        filter: `funcion_id=eq.${funcionId}`
        }, () => { //función que se ejecuta cada vez que pasa un cambio que matchea el filtro.
        onCambio();
        })
        .subscribe();

    return canal;
    
    }

    cerrarCanal(canal: RealtimeChannel) {
        this.supabase.instance.removeChannel(canal);
    }

}

