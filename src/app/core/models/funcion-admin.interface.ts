export interface PeliculaFuncionAdmin {
  id: string;
  titulo: string;
  duracion_min: number;
}

export interface SalaFuncionAdmin {
  id: string;
  nombre: string;
}

export interface FuncionAdmin {
  id: string;
  pelicula_id: string;
  sala_id: string;
  fecha_hora: string;
  duracion_min: number;
  formato: string;
  idioma: string;
  precio: number;
  precio_vip: number | null;
  precio_preventa: number | null;
  fecha_fin_preventa: string | null;
  fin_bloqueo: string;
  activa: boolean;
  created_at: string;

  peliculas: PeliculaFuncionAdmin;
  salas: SalaFuncionAdmin;
}

export interface FuncionFormulario {
  pelicula_id: string;
  fecha_hora: string;
  duracion_min: number;
  formato: string;
  idioma: string;
  precio: number;
  precio_vip: number | null;
  precio_preventa: number | null;
  fecha_fin_preventa: string | null;
}