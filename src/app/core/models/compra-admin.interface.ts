export interface PerfilCompraAdmin {
  id: string;
  nombre: string;
  apellido: string | null;
}

export interface ButacaEntradaAdmin {
  fila: string;
  numero: number;
  tipo: string;
}

export interface PeliculaEntradaAdmin {
  titulo: string;
}

export interface SalaEntradaAdmin {
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
  qr_code: string;
  estado: 'valida' | 'usada' | 'cancelada';
  butacas: ButacaEntradaAdmin;
  funciones: FuncionEntradaAdmin;
}

export interface CompraAdmin {
  id: string;
  usuario_id: string | null;
  invitado_nombre: string | null;
  invitado_email: string | null;
  invitado_fecha_nacimiento: string | null;
  fecha: string;
  subtotal: number;
  descuento: number;
  credito_usado: number;
  total: number;
  estado: 'confirmada' | 'cancelada';
  puntos_ganados: number;
  perfiles: PerfilCompraAdmin | null;
  entradas: EntradaAdmin[];
}
