export interface MiPerfilEntrada {
  nombre: string;
  apellido: string | null;
}

export interface MiCompraEntrada {
  id: string;
  fecha: string;
  estado: 'confirmada' | 'cancelada';
  total: number;
  perfiles: MiPerfilEntrada | null;
}

export interface MiButacaEntrada {
  id: string;
  fila: string;
  numero: number;
  tipo: string;
}

export interface MiPeliculaEntrada {
  id: string;
  titulo: string;
  imagen_url: string | null;
}

export interface MiSalaEntrada {
  id: string;
  nombre: string;
}

export interface MiFuncionEntrada {
  id: string;
  fecha_hora: string;
  peliculas: MiPeliculaEntrada;
  salas: MiSalaEntrada;
}

export interface MiEntrada {
  id: string;
  compra_id: string;
  qr_code: string;
  estado: 'valida' | 'usada' | 'cancelada';
  compras: MiCompraEntrada;
  butacas: MiButacaEntrada;
  funciones: MiFuncionEntrada;
}

