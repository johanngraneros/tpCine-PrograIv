export interface SalaResumen {
  id: string;
  nombre: string;
}

export interface PeliculaResumen {
  titulo: string;
}

export interface FuncionDetalle {
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
  salas: SalaResumen;
  peliculas: PeliculaResumen;
}
