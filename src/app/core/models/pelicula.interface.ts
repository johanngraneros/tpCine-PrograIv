export interface Genero {
  id: string;
  nombre: string;
}

export interface PeliculaGenero {
  genero_id: string;
}

export interface PeliculaAdmin {
  id: string;
  titulo: string;
  sinopsis: string | null;
  duracion_min: number;
  imagen_url: string | null;
  restriccion_edad: number | null;
  activa: boolean;
  created_at: string;
  pelicula_generos: PeliculaGenero[];
}

export interface PeliculaFormulario {
  titulo: string;
  sinopsis: string;
  duracion_min: number;
  imagen_url: string;
  restriccion_edad: number | null;
  activa: boolean;
}