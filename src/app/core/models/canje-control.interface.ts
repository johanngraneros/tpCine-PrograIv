export interface ProductoCanjeControl {
  id: string;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  costo_puntos: number | null;
  categorias_productos: {
    nombre: string;
  } | null;
}

export interface UsuarioCanjeControl {
  id: string;
  nombre: string;
  apellido: string;
}

export interface CanjeControl {
  id: string;
  usuario_id: string;
  producto_id: string;
  puntos_utilizados: number;
  codigo: string;
  estado: 'pendiente' | 'utilizado' | 'cancelado';
  created_at: string;
  utilizado_at: string | null;
  validado_por: string | null;
  productos: ProductoCanjeControl;
  perfiles: UsuarioCanjeControl;
}