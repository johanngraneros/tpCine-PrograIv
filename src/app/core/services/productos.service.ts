import { Injectable, inject } from '@angular/core';
import { Supabase } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class ProductosService {
  private supabase = inject(Supabase);

  obtenerProductos() {
    return this.supabase.instance
      .from('productos')
      .select(`
        id,
        categoria_id,
        nombre,
        descripcion,
        precio,
        costo_puntos,
        activo,
        imagen_url,
        created_at,
        categorias_productos (
          id,
          nombre
        )
      `)
      .eq('activo', true)
      .order('nombre', {
        ascending: true
      });
  }

 obtenerProductosCandy() {
    return this.supabase.instance
      .from('productos')
      .select(`
        id,
        categoria_id,
        nombre,
        descripcion,
        precio,
        costo_puntos,
        activo,
        imagen_url,
        created_at,
        categorias_productos!inner (
          id,
          nombre
        )
      `)
      .eq('activo', true)
      .neq(
        'categorias_productos.nombre',
        'Entradas'
      )
      .order('nombre', {
        ascending: true
      });
  }

  obtenerMisCanjes(usuarioId: string) {
    return this.supabase.instance
        .from('canjes')
        .select(`
        id,
        usuario_id,
        producto_id,
        puntos_utilizados,
        codigo,
        estado,
        created_at,
        utilizado_at,
        validado_por,
        productos (
            id,
            categoria_id,
            nombre,
            descripcion,
            precio,
            costo_puntos,
            activo,
            imagen_url,
            created_at,
            categorias_productos (
            id,
            nombre
            )
        )
        `)
        .eq('usuario_id', usuarioId)
        .order('created_at', {
        ascending: false
        });
    }

  canjearProducto(productoId: string) {
    return this.supabase.instance.rpc(
      'canjear_producto',
      {
        p_producto_id: productoId
      }
    );
  }
}