import {
  Injectable,
  inject
} from '@angular/core';

import { Supabase } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AdminComprasService {
  private supabase = inject(Supabase);

  obtenerActividadReciente() {
    return this.supabase.instance
      .from('registro_actividad')
      .select(`
        id,
        accion,
        entidad,
        registro_id,
        detalle,
        fecha,
        perfiles (nombre, apellido)
      `)
      .order('fecha', { ascending: false })
      .limit(15);
  }

  obtenerConfiguracionDescuentos() {
    return this.supabase.instance
      .from('configuracion_descuentos')
      .select('porcentaje_primera_compra, porcentaje_mayores_50')
      .eq('id', true)
      .single();
  }

  actualizarConfiguracionDescuentos(
    porcentajePrimeraCompra: number,
    porcentajeMayores50: number
  ) {
    return this.supabase.instance
      .from('configuracion_descuentos')
      .update({
        porcentaje_primera_compra: porcentajePrimeraCompra,
        porcentaje_mayores_50: porcentajeMayores50,
        actualizado_en: new Date().toISOString()
      })
      .eq('id', true);
  }

  obtenerCompras() {
    return this.supabase.instance
      .from('compras')
      .select(`
        id,
        usuario_id,
        invitado_nombre,
        invitado_email,
        invitado_fecha_nacimiento,
        fecha,
        subtotal,
        descuento,
        credito_usado,
        total,
        estado,
        puntos_ganados,
        perfiles (
          id,
          nombre,
          apellido
        ),
        entradas (
          id,
          qr_code,
          estado,
          butacas (
            fila,
            numero,
            tipo
          ),
          funciones (
            id,
            fecha_hora,
            peliculas (
              titulo
            ),
            salas (
              nombre
            )
          )
        )
      `)
      .order('fecha', {
        ascending: false
      });
  }

  obtenerComprasParaEstadisticas() {
    return this.supabase.instance
      .from('compras')
      .select(`
        id,
        fecha,
        total,
        estado,
        entradas (
          id,
          estado,
          funciones (
            fecha_hora,
            peliculas (titulo)
          )
        )
      `)
      .order('fecha', { ascending: false });
  }

  cancelarCompra(compraId: string) {
    return this.supabase.instance.rpc(
      'cancelar_compra',
      {
        p_compra_id: compraId
      }
    );
  }

  async obtenerProductoCandyMasVendido() {
    const [individuales, combos] = await Promise.all([
      this.supabase.instance
        .from('compra_productos')
        .select(`
          cantidad,
          estado,
          productos (id, nombre),
          compras!inner (estado)
        `)
        .neq('estado', 'cancelada')
        .eq('compras.estado', 'confirmada'),
      this.supabase.instance
        .from('compra_combos')
        .select(`
          cantidad,
          estado,
          compras!inner (estado),
          combos!inner (
            combo_productos (
              cantidad,
              productos (id, nombre)
            )
          )
        `)
        .neq('estado', 'cancelada')
        .eq('compras.estado', 'confirmada')
    ]);

    if (individuales.error || combos.error) {
      return {
        data: null,
        error: individuales.error ?? combos.error
      };
    }

    interface ProductoRelacionado {
      id: string;
      nombre: string;
    }

    interface CompraIndividual {
      cantidad: number;
      productos: ProductoRelacionado;
    }

    interface ProductoCombo {
      cantidad: number;
      productos: ProductoRelacionado;
    }

    interface CompraCombo {
      cantidad: number;
      combos: {
        combo_productos: ProductoCombo[];
      };
    }

    const cantidades = new Map<
      string,
      { nombre: string; cantidad: number }
    >();

    const sumar = (
      producto: ProductoRelacionado,
      cantidad: number
    ) => {
      const actual = cantidades.get(producto.id);

      cantidades.set(producto.id, {
        nombre: producto.nombre,
        cantidad: (actual?.cantidad ?? 0) + cantidad
      });
    };

    for (
      const item of individuales.data as unknown as CompraIndividual[]
    ) {
      if (item.productos) {
        sumar(item.productos, Number(item.cantidad));
      }
    }

    for (const compra of combos.data as unknown as CompraCombo[]) {
      for (const detalle of compra.combos?.combo_productos ?? []) {
        if (detalle.productos) {
          sumar(
            detalle.productos,
            Number(compra.cantidad) * Number(detalle.cantidad)
          );
        }
      }
    }

    const masVendido = [...cantidades.entries()]
      .map(([id, producto]) => ({ id, ...producto }))
      .sort((a, b) => b.cantidad - a.cantidad)[0] ?? null;

    return {
      data: masVendido,
      error: null
    };
  }
}
