import { Injectable, inject, signal } from '@angular/core';
import { Supabase } from '../supabase';
import type { User } from '@supabase/supabase-js';

@Injectable({  
  providedIn: 'root'
})
export class AuthService {
  private supabase = inject(Supabase);

  // Signal reactivo con el usuario logueado (o null si no hay sesión)
  currentUser = signal<User | null>(null);
  sesionLista = signal(false); 

   constructor() {
    this.supabase.instance.auth.getSession().then(({ data }) => {
      this.currentUser.set(data.session?.user ?? null);
      this.sesionLista.set(true); // NUEVO: recién acá sabemos la verdad
    });

    this.supabase.instance.auth.onAuthStateChange((_event, session) => {
      this.currentUser.set(session?.user ?? null);
      this.sesionLista.set(true); // por si cambia antes de que resuelva lo de arriba
    });
  }

  async register(
    email: string,
    password: string,
    nombre: string,
    apellido: string,
    fechaNacimiento: string,
    tipoSangre: string,
    colorOjos: string,
    diasVacaciones: number
  ) {
    return this.supabase.instance.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre,
          apellido,
          fecha_nacimiento: fechaNacimiento,
          tipo_sangre: tipoSangre,
          color_ojos: colorOjos,
          dias_vacaciones: diasVacaciones,
          rol: 'usuario'
        }
      }
    });
  }

  async login(email: string, password: string) {
    const { data, error } = await this.supabase.instance.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  }

  async logout() {
    const { error } = await this.supabase.instance.auth.signOut();
    return { error };
  }

  async getPerfil(userId: string) {
    const { data, error } = await this.supabase.instance
      .from('perfiles')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  }
}