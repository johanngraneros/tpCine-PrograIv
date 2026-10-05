import { Injectable, inject } from '@angular/core';
import { Combo, ComboFormulario } from '../models/combo.interface';
import { Producto } from '../models/producto.interface';
import { Supabase } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class CombosService {
  private supabase = inject(Supabase);

  async obtenerCombos(soloActivos = true) {
    let consulta = this.supabase.instance
      .from('combos')
      .select('id, nombre, precio_fijo, activo')
      .order('nombre');

    if (soloActivos) {
      consulta = consulta.eq('activo', true);
    }

    const resultadoCombos = await consulta;

    if (resultadoCombos.error || !resultadoCombos.data?.length) {
      return {
        data: (resultadoCombos.data ?? []) as Combo[],
        error: resultadoCombos.error
      };
    }

    const comboIds = resultadoCombos.data.map(combo => combo.id);
    const resultadoDetalles = await this.supabase.instance
      .from('combo_productos')
      .select('combo_id, producto_id, cantidad')
      .in('combo_id', comboIds);

    if (resultadoDetalles.error) {
      return { data: null, error: resultadoDetalles.error };
    }

    const productoIds = [
      ...new Set((resultadoDetalles.data ?? []).map(detalle => detalle.producto_id))
    ];

    let productos: Producto[] = [];
    if (productoIds.length > 0) {
      const resultadoProductos = await this.supabase.instance
        .from('productos')
        .select(`
          id, categoria_id, nombre, descripcion, precio,
          costo_puntos, activo, imagen_url, created_at,
          categorias_productos (id, nombre)
        `)
        .in('id', productoIds);

      if (resultadoProductos.error) {
        return { data: null, error: resultadoProductos.error };
      }

      productos = (resultadoProductos.data ?? []) as unknown as Producto[];
    }

    const combos = resultadoCombos.data.map(combo => ({
      ...combo,
      combo_productos: (resultadoDetalles.data ?? [])
        .filter(detalle => detalle.combo_id === combo.id)
        .map(detalle => ({
          producto_id: detalle.producto_id,
          cantidad: detalle.cantidad,
          productos: productos.find(producto => producto.id === detalle.producto_id)!
        }))
        .filter(detalle => Boolean(detalle.productos))
    })) as Combo[];

    return { data: combos, error: null };
  }

  async crearCombo(formulario: ComboFormulario) {
    const { data, error } = await this.supabase.instance
      .from('combos')
      .insert({
        nombre: formulario.nombre.trim(),
        precio_fijo: formulario.precio_fijo,
        activo: formulario.activo
      })
      .select('id')
      .single();

    if (error || !data) {
      return { data: null, error };
    }

    const detalle = [
      {
        combo_id: data.id,
        producto_id: formulario.pochoclo_id,
        cantidad: formulario.cantidad_pochoclo
      },
      {
        combo_id: data.id,
        producto_id: formulario.bebida_id,
        cantidad: formulario.cantidad_bebida
      }
    ];

    const resultado = await this.supabase.instance
      .from('combo_productos')
      .insert(detalle);

    if (resultado.error) {
      await this.supabase.instance
        .from('combos')
        .delete()
        .eq('id', data.id);
    }

    return {
      data: resultado.error ? null : data,
      error: resultado.error
    };
  }

  async actualizarCombo(comboId: string, formulario: ComboFormulario) {
    const actualizado = await this.supabase.instance
      .from('combos')
      .update({
        nombre: formulario.nombre.trim(),
        precio_fijo: formulario.precio_fijo,
        activo: formulario.activo
      })
      .eq('id', comboId);

    if (actualizado.error) {
      return actualizado;
    }

    await this.supabase.instance
      .from('combo_productos')
      .delete()
      .eq('combo_id', comboId);

    return this.supabase.instance
      .from('combo_productos')
      .insert([
        {
          combo_id: comboId,
          producto_id: formulario.pochoclo_id,
          cantidad: formulario.cantidad_pochoclo
        },
        {
          combo_id: comboId,
          producto_id: formulario.bebida_id,
          cantidad: formulario.cantidad_bebida
        }
      ]);
  }

  cambiarEstado(comboId: string, activo: boolean) {
    return this.supabase.instance
      .from('combos')
      .update({ activo })
      .eq('id', comboId);
  }
}
