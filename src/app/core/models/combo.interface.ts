import { Producto } from './producto.interface';

export interface ComboProducto {
  producto_id: string;
  cantidad: number;
  productos: Producto;
}

export interface Combo {
  id: string;
  nombre: string;
  precio_fijo: number;
  activo: boolean;
  combo_productos: ComboProducto[];
}

export interface ComboFormulario {
  nombre: string;
  precio_fijo: number;
  activo: boolean;
  pochoclo_id: string;
  bebida_id: string;
  cantidad_pochoclo: number;
  cantidad_bebida: number;
}

export interface ComboSeleccionadoCompra {
  combo_id: string;
  cantidad: number;
}
