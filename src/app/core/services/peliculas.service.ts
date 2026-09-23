import { Injectable, inject } from '@angular/core';
import { Supabase } from '../services/supabase.service';

@Injectable({  
  providedIn: 'root'
})
export class PeliculasService {
  private supabase = inject(Supabase) ;

  async getTop3Vendidas() {
    const { data, error } = await this.supabase.instance
      .from('peliculas_con_stats')
      .select('*')
      .order('entradas_vendidas', { ascending: false })
      .limit(3);
    return { data, error };
  }

  async getTodasActivas() {
    const { data, error } = await this.supabase.instance
      .from('peliculas_con_stats')
      .select('*')
      .eq('activa', true);
    return { data, error };
  }

  async getPorId(peliculaId: string) {
    const { data, error } = await this.supabase.instance
      .from('peliculas_con_stats')
      .select('*')
      .eq('id', peliculaId)
      .single();
    return { data, error };
  }

    async getGeneros() {
    const { data, error } = await this.supabase.instance
      .from('generos')
      .select('*')
      .order('nombre');
    return { data, error };
  }

  async buscar(texto: string, generoId: string | null) {
    let query = this.supabase.instance
      .from('peliculas_con_stats')
      .select('*, pelicula_generos!inner(genero_id)')
      .eq('activa', true);

    if (texto) {
      query = query.ilike('titulo', `%${texto}%`);
    }
    if (generoId) {
      query = query.eq('pelicula_generos.genero_id', generoId);
    }

    const { data, error } = await query;
    return { data, error };
  }

  async getFuncionesDePelicula(peliculaId: string) {
    const { data, error } = await this.supabase.instance
      .from('funciones')
      .select('*, salas(nombre)')
      .eq('pelicula_id', peliculaId)
      .gte('fecha_hora', new Date().toISOString()) //devuelve funciones cuya fecha y hora sean mayores o iguales al momento actual, excluye funciones pasadas.
      .order('fecha_hora');
    return { data, error };
  }

    async getResenas(peliculaId: string) {
    const { data, error } = await this.supabase.instance
      .from('resenas')
      .select('*, perfiles(nombre)')
      .eq('pelicula_id', peliculaId)
      .order('fecha', { ascending: false });
    return { data, error };
  }

  async crearResena(peliculaId: string, usuarioId: string, estrellas: number, comentario: string) {
    const { data, error } = await this.supabase.instance
      .from('resenas')
      .insert({ pelicula_id: peliculaId, usuario_id: usuarioId, estrellas, comentario });
    return { data, error };
  }

}
