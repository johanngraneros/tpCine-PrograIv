export interface MiPeliculaResena {
  estrellas: number;
  comentario: string;
  fecha: string;
}

export interface MiPelicula {
  id: string;
  titulo: string;
  imagenUrl: string | null;
  ultimaFuncion: string;
  funcionesVistas: string[];
  versionesVistas: string[];
  cantidadEntradas: number;
  resena: MiPeliculaResena | null;
}
