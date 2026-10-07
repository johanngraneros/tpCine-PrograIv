import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

function corregirAcentos(mensaje: string): string {
  const correcciones: Array<[RegExp, string]> = [
    [/\banos\b/gi, 'años'],
    [/\banio\b/gi, 'año'],
    [/\banios\b/gi, 'años'],
    [/\bpelicula\b/gi, 'película'],
    [/\bpeliculas\b/gi, 'películas'],
    [/\bfuncion\b/gi, 'función'],
    [/\bfunciones\b/gi, 'funciones'],
    [/\bsesion\b/gi, 'sesión'],
    [/\bsesiones\b/gi, 'sesiones'],
    [/\bseleccion\b/gi, 'selección'],
    [/\bcodigo\b/gi, 'código'],
    [/\bcodigos\b/gi, 'códigos'],
    [/\bcredito\b/gi, 'crédito'],
    [/\boperacion\b/gi, 'operación'],
    [/\boperaciones\b/gi, 'operaciones'],
    [/\bcalificacion\b/gi, 'calificación'],
    [/\bcalificaciones\b/gi, 'calificaciones'],
    [/\bresena\b/gi, 'reseña'],
    [/\bresenas\b/gi, 'reseñas'],
    [/\bminima\b/gi, 'mínima'],
    [/\bminimas\b/gi, 'mínimas'],
    [/\bmaxima\b/gi, 'máxima'],
    [/\bmaximas\b/gi, 'máximas'],
    [/\bmas\b/gi, 'más'],
    [/\btambien\b/gi, 'también'],
    [/\bestan\b/gi, 'están'],
    [/\bencontro\b/gi, 'encontró'],
    [/\bcumples\b/gi, 'cumplís'],
    [/\bdebes\b/gi, 'debés'],
    [/\btienes\b/gi, 'tenés'],
    [/\bpuedes\b/gi, 'podés'],
    [/\btenes\b/gi, 'tenés'],
    [/\bpodes\b/gi, 'podés'],
    [/\bconexion\b/gi, 'conexión'],
    [/\bconfirmacion\b/gi, 'confirmación'],
    [/\bcancelacion\b/gi, 'cancelación'],
    [/\brestriccion\b/gi, 'restricción'],
    [/\binformacion\b/gi, 'información'],
    [/\belectronico\b/gi, 'electrónico'],
    [/\bnumero\b/gi, 'número'],
    [/\bnumeros\b/gi, 'números']
  ];

  return correcciones.reduce(
    (texto, [palabra, correccion]) => texto.replace(palabra, correccion),
    mensaje
  );
}

export function traducirError(error: unknown, mensajeAlternativo = 'Ocurrió un error. Intentá nuevamente.'): string {
  const mensaje = error instanceof Error
    ? error.message
    : typeof error === 'object' && error && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : '';

  const normalizado = mensaje.toLowerCase();
  if (normalizado.includes('invalid login credentials')) return 'El correo o la contraseña son incorrectos.';
  if (normalizado.includes('email not confirmed')) return 'Primero tenés que confirmar tu correo electrónico.';
  if (normalizado.includes('user already registered') || normalizado.includes('already been registered')) return 'Este correo ya está registrado.';
  if (normalizado.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (normalizado.includes('duplicate key') || normalizado.includes('23505')) return 'Ya existe un registro con esos datos.';
  if (normalizado.includes('network') || normalizado.includes('fetch')) return 'No se pudo conectar con el servidor. Revisá tu conexión.';
  if (normalizado.includes('jwt') || normalizado.includes('session')) return 'Tu sesión venció. Volvé a iniciar sesión.';
  if (normalizado.includes('permission denied') || normalizado.includes('row-level security') || normalizado.includes('42501')) return 'No tenés permisos para realizar esta operación.';
  if (normalizado.includes('foreign key') || normalizado.includes('23503')) return 'No se puede completar la operación porque el registro está siendo utilizado.';
  if (normalizado.includes('not-null') || normalizado.includes('null value') || normalizado.includes('23502')) return 'Falta completar un dato obligatorio.';
  if (normalizado.includes('check constraint') || normalizado.includes('23514')) return 'Uno de los datos ingresados no es válido.';
  if (normalizado.includes('invalid input syntax') || normalizado.includes('22p02')) return 'El formato de uno de los datos no es válido.';
  if (normalizado.includes('not found') || normalizado.includes('pgrst116')) return 'No se encontró el registro solicitado.';
  if (normalizado.includes('timeout')) return 'La operación tardó demasiado. Intentá nuevamente.';
  if (normalizado.includes('rate limit') || normalizado.includes('too many requests')) return 'Se realizaron demasiados intentos. Esperá unos minutos.';
  if (normalizado.includes('signup is disabled')) return 'El registro de usuarios está deshabilitado.';
  if (normalizado.includes('weak password')) return 'La contraseña no cumple los requisitos de seguridad.';
  if (normalizado.includes('unauthorized') || normalizado.includes('forbidden')) return 'No tenés permisos para realizar esta operación.';

  // Las funciones RPC del proyecto ya devuelven algunas reglas de negocio en español.
  const pareceEspanol = /\b(no se puede|no hay|entrada|compra|canje|butaca|función|funcion|saldo|puntos|usuario|película|pelicula)\b/i.test(mensaje);
  if (pareceEspanol) return corregirAcentos(mensaje);

  return mensajeAlternativo;
}

@Injectable({  
  providedIn: 'root'
})
export class Supabase {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(environment.supabase.Url, environment.supabase.Key);
  }

  get instance(): SupabaseClient {
    return this.client;
  }
}
