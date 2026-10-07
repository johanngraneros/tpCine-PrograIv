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

  async getFormatosDisponibles(peliculaIds: string[]) {
    if (peliculaIds.length === 0) return { data: [], error: null };
    return this.supabase.instance
      .from('funciones')
      .select('pelicula_id, formato, idioma')
      .in('pelicula_id', peliculaIds)
      .eq('activa', true)
      .gte('fecha_hora', new Date().toISOString());
  }

  async getProximosEstrenos() {
    const { data, error } = await this.supabase.instance
      .from('peliculas')
      .select('id, titulo, sinopsis, imagen_url, fecha_estreno')
      .eq('activa', true)
      .gte('fecha_estreno', new Date().toISOString().slice(0, 10))
      .order('fecha_estreno', { ascending: true })
      .limit(4);

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
    const publicas = await this.supabase.instance.rpc('obtener_resenas_publicas', {
      p_pelicula_id: peliculaId
    });

    if (!publicas.error) {
      return {
        data: (publicas.data ?? []).map((resena: any) => ({
          ...resena,
          perfiles: {
            nombre: resena.autor_nombre ?? 'Usuario',
            apellido: resena.autor_apellido ?? ''
          }
        })),
        error: null
      };
    }

    // Mientras la función SQL todavía no exista, los usuarios autenticados
    // pueden seguir usando la relación original si su política lo permite.
    const relacionadas = await this.supabase.instance
      .from('resenas')
      .select('id, pelicula_id, usuario_id, estrellas, comentario, fecha, perfiles(nombre, apellido)')
      .eq('pelicula_id', peliculaId)
      .order('fecha', { ascending: false });

    if (!relacionadas.error) return relacionadas;

    // Último recurso: las reseñas siguen siendo visibles aunque Supabase no
    // permita leer perfiles. El autor se presenta como "Usuario".
    const respaldo = await this.supabase.instance
      .from('resenas')
      .select('id, pelicula_id, usuario_id, estrellas, comentario, fecha')
      .eq('pelicula_id', peliculaId)
      .order('fecha', { ascending: false });

    return {
      data: (respaldo.data ?? []).map(resena => ({ ...resena, perfiles: null })),
      error: respaldo.error
    };
  }

  async crearResena(peliculaId: string, usuarioId: string, estrellas: number, comentario: string) {
    const { data, error } = await this.supabase.instance
      .from('resenas')
      .insert({ pelicula_id: peliculaId, usuario_id: usuarioId, estrellas, comentario });
    return { data, error };
  }

  async actualizarResena(resenaId: string, usuarioId: string, estrellas: number, comentario: string) {
    const { data, error } = await this.supabase.instance
      .from('resenas')
      .update({ estrellas, comentario })
      .eq('id', resenaId)
      .eq('usuario_id', usuarioId)
      .select()
      .single();
    return { data, error };
  }

}
