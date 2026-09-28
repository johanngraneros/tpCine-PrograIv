import {Injectable, inject} from '@angular/core';
import { Supabase } from './supabase.service';
import type {PeliculaAdmin, PeliculaFormulario} from '../models/pelicula.interface';

@Injectable({
  providedIn: 'root'
})
export class AdminPeliculasService {
  private supabase = inject(Supabase);

  async obtenerPeliculas() {
    return this.supabase.instance
      .from('peliculas')
      .select(`
        *,
        pelicula_generos (
          genero_id
        )
      `)
      .order('created_at', {
        ascending: false
      });
  }

  async obtenerGeneros() {
    return this.supabase.instance
      .from('generos')
      .select('*')
      .order('nombre');
  }

  async crearPelicula(
    formulario: PeliculaFormulario,
    generoIds: string[]
  ) {
    const peliculaNueva = {
      titulo: formulario.titulo.trim(),
      sinopsis:
        formulario.sinopsis.trim() || null,
      duracion_min: formulario.duracion_min,
      imagen_url:
        formulario.imagen_url.trim() || null,
      restriccion_edad:
        formulario.restriccion_edad,
      activa: formulario.activa
    };

    const {
      data: pelicula,
      error: peliculaError
    } = await this.supabase.instance
      .from('peliculas')
      .insert(peliculaNueva)
      .select()
      .single();

    if (peliculaError || !pelicula) {
      return {
        data: null,
        error: peliculaError
      };
    }

    if (generoIds.length === 0) {
      return {
        data: pelicula,
        error: null
      };
    }

    const relaciones = generoIds.map(
      generoId => ({
        pelicula_id: pelicula.id,
        genero_id: generoId
      })
    );

    const { error: generosError } =
      await this.supabase.instance
        .from('pelicula_generos')
        .insert(relaciones);

    if (generosError) {
      /*
      Si no se pudieron asociar los géneros,
      eliminamos la película para no dejar
      un registro incompleto.
      */        
      await this.supabase.instance
        .from('peliculas')
        .delete()
        .eq('id', pelicula.id);

      return {
        data: null,
        error: generosError
      };
    }

    return {
      data: pelicula,
      error: null
    };
  }

  async actualizarPelicula(
    peliculaId: string,
    formulario: PeliculaFormulario,
    generoIds: string[]
  ) {
    const cambios = {
      titulo: formulario.titulo.trim(),
      sinopsis:
        formulario.sinopsis.trim() || null,
      duracion_min: formulario.duracion_min,
      imagen_url:
        formulario.imagen_url.trim() || null,
      restriccion_edad:
        formulario.restriccion_edad,
      activa: formulario.activa
    };

    const { error: peliculaError } =
      await this.supabase.instance
        .from('peliculas')
        .update(cambios)
        .eq('id', peliculaId);

    if (peliculaError) {
      return {
        data: null,
        error: peliculaError
      };
    }

    const { error: eliminarGenerosError } =
      await this.supabase.instance
        .from('pelicula_generos')
        .delete()
        .eq('pelicula_id', peliculaId);

    if (eliminarGenerosError) {
      return {
        data: null,
        error: eliminarGenerosError
      };
    }

    if (generoIds.length > 0) {
      const relaciones = generoIds.map(
        generoId => ({
          pelicula_id: peliculaId,
          genero_id: generoId
        })
      );

      const { error: generosError } =
        await this.supabase.instance
          .from('pelicula_generos')
          .insert(relaciones);

      if (generosError) {
        return {
          data: null,
          error: generosError
        };
      }
    }

    return {
      data: cambios,
      error: null
    };
  }

  async cambiarEstado(
    peliculaId: string,
    activa: boolean
  ) {
    return this.supabase.instance
      .from('peliculas')
      .update({ activa })
      .eq('id', peliculaId);
  }

  async eliminarPelicula(
    peliculaId: string
  ) {
    return this.supabase.instance
      .from('peliculas')
      .delete()
      .eq('id', peliculaId);
  }
}