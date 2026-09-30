import { Injectable, inject } from '@angular/core';
import { ProductoFormulario } from '../models/producto.interface';
import { Supabase } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AdminProductosService {
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
      .order('created_at', {
        ascending: false
      });
  }

  obtenerCategorias() {
    return this.supabase.instance
      .from('categorias_productos')
      .select('*')
      .order('nombre', {
        ascending: true
      });
  }

  async subirImagen(archivo: File) {
    const nombreSeguro = archivo.name
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, '-');

    const ruta =
      `${crypto.randomUUID()}-${nombreSeguro}`;

    const { error } =
      await this.supabase.instance.storage
        .from('productos')
        .upload(ruta, archivo, {
          cacheControl: '3600',
          upsert: false
        });

    if (error) {
      return {
        data: null,
        error
      };
    }

    const { data } =
      this.supabase.instance.storage
        .from('productos')
        .getPublicUrl(ruta);

    return {
      data: {
        imagenUrl: data.publicUrl,
        ruta
      },
      error: null
    };
  }

  async eliminarImagen(imagenUrl: string) {
    const marcador =
      '/storage/v1/object/public/productos/';

    const posicion =
      imagenUrl.indexOf(marcador);

    if (posicion === -1) {
      return {
        data: null,
        error: null
      };
    }

    const rutaCodificada =
      imagenUrl.substring(
        posicion + marcador.length
      );

    const ruta =
      decodeURIComponent(rutaCodificada);

    return this.supabase.instance.storage
      .from('productos')
      .remove([ruta]);
  }

  crearProducto(
    formulario: ProductoFormulario,
    imagenUrl: string | null
  ) {
    return this.supabase.instance
      .from('productos')
      .insert({
        categoria_id:
          formulario.categoria_id,
        nombre:
          formulario.nombre.trim(),
        descripcion:
          formulario.descripcion.trim() ||
          null,
        precio:
          formulario.precio,
        costo_puntos:
          formulario.costo_puntos,
        activo:
          formulario.activo,
        imagen_url:
          imagenUrl
      })
      .select()
      .single();
  }

  actualizarProducto(
    productoId: string,
    formulario: ProductoFormulario,
    imagenUrl: string | null
  ) {
    return this.supabase.instance
      .from('productos')
      .update({
        categoria_id:
          formulario.categoria_id,
        nombre:
          formulario.nombre.trim(),
        descripcion:
          formulario.descripcion.trim() ||
          null,
        precio:
          formulario.precio,
        costo_puntos:
          formulario.costo_puntos,
        activo:
          formulario.activo,
        imagen_url:
          imagenUrl
      })
      .eq('id', productoId)
      .select()
      .single();
  }

  cambiarEstado(
    productoId: string,
    activo: boolean
  ) {
    return this.supabase.instance
      .from('productos')
      .update({ activo })
      .eq('id', productoId);
  }

  eliminarProducto(productoId: string) {
    return this.supabase.instance
      .from('productos')
      .delete()
      .eq('id', productoId);
  }
}