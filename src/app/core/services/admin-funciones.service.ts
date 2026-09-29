import {
  Injectable,
  inject
} from '@angular/core';

import { Supabase } from './supabase.service';

import type {
  FuncionFormulario
} from '../models/funcion-admin.interface';

@Injectable({
  providedIn: 'root'
})
export class AdminFuncionesService {
  private supabase = inject(Supabase);

  obtenerFunciones() {
    return this.supabase.instance
      .from('funciones')
      .select(`
        *,
        peliculas (
          id,
          titulo,
          duracion_min
        ),
        salas (
          id,
          nombre
        )
      `)
      .order('fecha_hora', {
        ascending: true
      });
  }

  obtenerPeliculasActivas() {
    return this.supabase.instance
      .from('peliculas')
      .select(`
        id,
        titulo,
        duracion_min
      `)
      .eq('activa', true)
      .order('titulo');
  }

  crearFuncion(
    formulario: FuncionFormulario
  ) {
    return this.supabase.instance.rpc(
      'crear_funcion_automatica', //El frontend no decide la sala: la base de datos la asigna.
      {
        p_pelicula_id:
          formulario.pelicula_id,

        p_fecha_hora:
          new Date(
            formulario.fecha_hora
          ).toISOString(),

        p_duracion_min:
          formulario.duracion_min,

        p_formato:
          formulario.formato,

        p_idioma:
          formulario.idioma,

        p_precio:
          formulario.precio,

        p_precio_vip:
          formulario.precio_vip,

        p_precio_preventa:
          formulario.precio_preventa,

        p_fecha_fin_preventa:
          formulario.fecha_fin_preventa
            ? new Date(
                formulario.fecha_fin_preventa
              ).toISOString()
            : null
      }
    );
  }

  actualizarFuncion(
    funcionId: string,
    formulario: FuncionFormulario
    ) {
        return this.supabase.instance.rpc(
            'actualizar_funcion_automatica',
            {
            p_funcion_id:
                funcionId,

            p_pelicula_id:
                formulario.pelicula_id,

            p_fecha_hora:
                new Date(
                formulario.fecha_hora
                ).toISOString(),

            p_duracion_min:
                formulario.duracion_min,

            p_formato:
                formulario.formato,

            p_idioma:
                formulario.idioma,

            p_precio:
                formulario.precio,

            p_precio_vip:
                formulario.precio_vip,

            p_precio_preventa:
                formulario.precio_preventa,

            p_fecha_fin_preventa:
                formulario.fecha_fin_preventa
                ? new Date(
                    formulario.fecha_fin_preventa
                    ).toISOString()
                : null
            }
        );
    }

  cambiarEstado(
    funcionId: string,
    activa: boolean
    ) {
    return this.supabase.instance.rpc(
        'cambiar_estado_funcion_automatica',
        {
            p_funcion_id: funcionId,
            p_activa: activa
        }
      );
    }

  eliminarFuncion(
    funcionId: string
  ) {
    return this.supabase.instance
      .from('funciones')
      .delete()
      .eq('id', funcionId);
  }
}