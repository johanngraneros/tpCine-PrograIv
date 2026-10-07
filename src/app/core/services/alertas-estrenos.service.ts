import { Injectable, inject } from '@angular/core';
import { Supabase } from './supabase.service';
import { esPreventaActiva } from '../utils/fecha.utils';

@Injectable({ providedIn: 'root' })
export class AlertasEstrenosService {
  private supabase = inject(Supabase);

  obtenerSuscripciones(usuarioId: string) {
    return this.supabase.instance
      .from('alertas_estrenos')
      .select('pelicula_id')
      .eq('usuario_id', usuarioId);
  }

  suscribirse(usuarioId: string, peliculaId: string) {
    return this.supabase.instance
      .from('alertas_estrenos')
      .upsert(
        { usuario_id: usuarioId, pelicula_id: peliculaId },
        { onConflict: 'usuario_id,pelicula_id' }
      );
  }

  cancelar(usuarioId: string, peliculaId: string) {
    return this.supabase.instance
      .from('alertas_estrenos')
      .delete()
      .eq('usuario_id', usuarioId)
      .eq('pelicula_id', peliculaId);
  }

  async obtenerNotificaciones(usuarioId: string) {
    const { data, error } = await this.supabase.instance
      .from('notificaciones_estrenos')
      .select('id, titulo, mensaje, pelicula_id, leida')
      .eq('usuario_id', usuarioId)
      .order('id', { ascending: false })
      .limit(20);

    const locales = this.obtenerNotificacionesLocales(usuarioId);
    const idsLeidos = this.obtenerIdsLeidos(usuarioId);
    const notificaciones = [...locales, ...(data ?? [])]
      .map(item => idsLeidos.has(item.id) ? { ...item, leida: true } : item)
      .slice(0, 20);
    return { data: notificaciones, error };
  }

  async marcarComoLeidas(usuarioId: string, ids: string[]) {
    if (ids.length === 0) return Promise.resolve({ error: null });

    this.guardarIdsLeidos(usuarioId, [
      ...this.obtenerIdsLeidos(usuarioId),
      ...ids
    ]);

    const idsLocales = new Set(ids.filter(id => id.startsWith('local-preventa-')));
    if (idsLocales.size > 0) {
      const locales = this.obtenerNotificacionesLocales(usuarioId)
        .map(item => idsLocales.has(item.id) ? { ...item, leida: true } : item);
      this.guardarNotificacionesLocales(usuarioId, locales);
    }

    const idsBase = ids.filter(id => !idsLocales.has(id));
    if (idsBase.length === 0) return { error: null };

    return this.supabase.instance
      .from('notificaciones_estrenos')
      .update({ leida: true })
      .eq('usuario_id', usuarioId)
      .in('id', idsBase);
  }

  async mostrarNotificacionesPendientes(usuarioId: string) {
    const { data, error } = await this.supabase.instance
      .from('notificaciones_estrenos')
      .select('id, titulo, mensaje, pelicula_id')
      .eq('usuario_id', usuarioId)
      .eq('leida', false);

    if (error || !data?.length || typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;

    for (const aviso of data) {
      new Notification(aviso.titulo, {
        body: aviso.mensaje,
        icon: '/icons/boca-192.png',
        tag: `estreno-${aviso.pelicula_id}`
      });
    }

    // La notificación queda sin leer hasta que el usuario la vea en la campanita.
  }

  async sincronizarNotificacionesPreventa(usuarioId: string) {
    const { data: suscripciones, error: errorSuscripciones } = await this.obtenerSuscripciones(usuarioId);
    if (errorSuscripciones) return { error: errorSuscripciones };

    const peliculasIds = (suscripciones ?? []).map(item => item.pelicula_id);
    if (peliculasIds.length === 0) return { error: null };

    const [{ data: funciones, error: errorFunciones }, { data: existentes, error: errorExistentes }] = await Promise.all([
      this.supabase.instance
        .from('funciones')
        .select('id, pelicula_id, fecha_hora, fecha_fin_preventa, precio_preventa, formato, idioma, peliculas(titulo)')
        .in('pelicula_id', peliculasIds)
        .eq('activa', true),
      this.supabase.instance
        .from('notificaciones_estrenos')
        .select('titulo, mensaje, pelicula_id')
        .eq('usuario_id', usuarioId)
    ]);

    if (errorFunciones || errorExistentes) return { error: errorFunciones ?? errorExistentes };

    const notificacionesExistentes = new Set(
      (existentes ?? []).map(item => `${item.pelicula_id}|${item.titulo}|${item.mensaje}`)
    );

    const nuevas = (funciones ?? [])
      .filter(funcion => esPreventaActiva(funcion))
      .map(funcion => {
        const pelicula = Array.isArray(funcion.peliculas) ? funcion.peliculas[0] : funcion.peliculas;
        const tituloPelicula = pelicula?.titulo ?? 'la película seleccionada';
        const titulo = 'Preventa disponible';
        const mensaje = `Ya podés comprar la preventa de "${tituloPelicula}" (${funcion.formato} · ${funcion.idioma}) por $${funcion.precio_preventa}.`;
        return {
          id: `local-preventa-${funcion.id}`,
          usuario_id: usuarioId,
          pelicula_id: funcion.pelicula_id,
          titulo,
          mensaje,
          leida: false
        };
      })
      .filter(item => !notificacionesExistentes.has(`${item.pelicula_id}|${item.titulo}|${item.mensaje}`))
      .filter(item => !this.obtenerNotificacionesLocales(usuarioId).some(local => local.id === item.id));

    if (nuevas.length === 0) return { error: null };
    const filasBase = nuevas.map(({ id: _idLocal, ...item }) => item);
    const { error } = await this.supabase.instance.from('notificaciones_estrenos').insert(filasBase);

    // Si las políticas de Supabase no permiten insertar desde el cliente,
    // se conserva la notificación en este navegador y aparece igualmente en la campanita.
    if (error) {
      this.guardarNotificacionesLocales(usuarioId, [
        ...this.obtenerNotificacionesLocales(usuarioId),
        ...nuevas
      ]);
    }

    return { error: null };
  }

  notificarPreventasActivas(peliculaTitulo: string, funciones: any[]) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const ahora = Date.now();
    for (const funcion of funciones) {
      if (!esPreventaActiva(funcion, ahora)) continue;

      const clave = `cineize-preventa-notificada-${funcion.id}`;
      if (localStorage.getItem(clave)) continue;

      new Notification(`Preventa disponible: ${peliculaTitulo}`, {
        body: `${funcion.formato} · ${funcion.idioma} por $${funcion.precio_preventa}`,
        icon: '/icons/boca-192.png',
        tag: `preventa-${funcion.id}`
      });
      localStorage.setItem(clave, '1');
    }
  }

  private obtenerNotificacionesLocales(usuarioId: string): any[] {
    try {
      return JSON.parse(localStorage.getItem(this.claveNotificacionesLocales(usuarioId)) ?? '[]');
    } catch {
      return [];
    }
  }

  private guardarNotificacionesLocales(usuarioId: string, notificaciones: any[]) {
    localStorage.setItem(
      this.claveNotificacionesLocales(usuarioId),
      JSON.stringify(notificaciones.slice(0, 20))
    );
  }

  private claveNotificacionesLocales(usuarioId: string) {
    return `cineize-notificaciones-preventa-${usuarioId}`;
  }

  private obtenerIdsLeidos(usuarioId: string): Set<string> {
    try {
      return new Set(JSON.parse(localStorage.getItem(this.claveIdsLeidos(usuarioId)) ?? '[]') as string[]);
    } catch {
      return new Set();
    }
  }

  private guardarIdsLeidos(usuarioId: string, ids: string[]) {
    localStorage.setItem(this.claveIdsLeidos(usuarioId), JSON.stringify([...new Set(ids)].slice(-100)));
  }

  private claveIdsLeidos(usuarioId: string) {
    return `cineize-notificaciones-leidas-${usuarioId}`;
  }
}
