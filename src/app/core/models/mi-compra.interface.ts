export interface MiCompraPelicula {
  id: string;
  titulo: string;
  imagen_url: string | null;
}

export interface MiCompraSala {
  id: string;
  nombre: string;
}

export interface MiCompraFuncion {
  id: string;
  fecha_hora: string;
  peliculas: MiCompraPelicula;
  salas: MiCompraSala;
}

export interface MiCompraButaca {
  id: string;
  fila: string;
  numero: number;
  tipo: string;
}

export interface MiCompraEntrada {
  id: string;
  qr_code: string;
  estado: 'valida' | 'usada' | 'cancelada';
  funciones: MiCompraFuncion;
  butacas: MiCompraButaca;
}

export interface MiCompraProducto {
  id: string;
  cantidad: number;
  estado: 'valida' | 'usada' | 'cancelada';
  productos: { nombre: string };
}

export interface MiCompraCombo {
  id: string;
  cantidad: number;
  estado: 'valida' | 'usada' | 'cancelada';
  combos: { nombre: string };
}

export interface MiCompra {
  id: string;
  fecha: string;
  subtotal: number;
  descuento: number;
  credito_usado: number;
  total: number;
  estado: 'confirmada' | 'cancelada';
  puntos_ganados: number;
  qr_code: string;
  entradas: MiCompraEntrada[];
  compra_productos: MiCompraProducto[];
  compra_combos: MiCompraCombo[];
}
