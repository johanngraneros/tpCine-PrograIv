export interface PerfilEntradaAdmin {
  id: string;
  nombre: string;
  apellido: string | null;
}

export interface CompraEntradaAdmin {
  id: string;
  fecha: string;
  estado: 'confirmada' | 'cancelada';
  perfiles: PerfilEntradaAdmin | null;
}

export interface ButacaAdmin {
  id: string;
  fila: string;
  numero: number;
  tipo: string;
}

export interface PeliculaEntradaAdmin {
  id: string;
  titulo: string;
}

export interface SalaEntradaAdmin {
  id: string;
  nombre: string;
}

export interface FuncionEntradaAdmin {
  id: string;
  fecha_hora: string;
  peliculas: PeliculaEntradaAdmin;
  salas: SalaEntradaAdmin;
}

export interface EntradaAdmin {
  id: string;
  compra_id: string;
  funcion_id: string;
  butaca_id: string;
  qr_code: string;
  estado: 'valida' | 'usada' | 'cancelada';
  compras: CompraEntradaAdmin;
  butacas: ButacaAdmin;
  funciones: FuncionEntradaAdmin;
}