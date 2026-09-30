export interface CategoriaProducto {
  id: string;
  nombre: string;
}

export interface Producto {
  id: string;
  categoria_id: string | null;
  nombre: string;
  descripcion: string | null;
  precio: number;
  costo_puntos: number | null;
  activo: boolean;
  imagen_url: string | null;
  created_at: string;
  categorias_productos: CategoriaProducto | null;
}

export interface Canje {
  id: string;
  usuario_id: string;
  producto_id: string;
  puntos_utilizados: number;
  codigo: string;
  estado: 'pendiente' | 'utilizado' | 'cancelado';
  created_at: string;
  utilizado_at: string | null;
  validado_por: string | null;
  productos: Producto;
}

export interface ProductoFormulario {
  categoria_id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  costo_puntos: number | null;
  activo: boolean;
  imagen_url: string;
}