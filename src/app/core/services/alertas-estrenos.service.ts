import { Injectable, inject } from '@angular/core';
import { Supabase } from './supabase.service';

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

    await this.supabase.instance
      .from('notificaciones_estrenos')
      .update({ leida: true })
      .in('id', data.map(aviso => aviso.id));
  }
}
