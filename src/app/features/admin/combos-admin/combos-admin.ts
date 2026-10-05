import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Combo, ComboFormulario } from '../../../core/models/combo.interface';
import { Producto } from '../../../core/models/producto.interface';
import { AdminProductosService } from '../../../core/services/admin-productos.service';
import { CombosService } from '../../../core/services/combos.service';

@Component({
  selector: 'app-combos-admin',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './combos-admin.html',
  styleUrl: './combos-admin.css'
})
export class CombosAdmin implements OnInit {
  private formBuilder = inject(FormBuilder);
  private combosService = inject(CombosService);
  private productosService = inject(AdminProductosService);

  combos = signal<Combo[]>([]);
  pochoclos = signal<Producto[]>([]);
  bebidas = signal<Producto[]>([]);
  editandoId = signal<string | null>(null);
  cargando = signal(true);
  guardando = signal(false);
  mensajeError = signal('');
  mensajeExito = signal('');

  formulario = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    precio_fijo: [0, [Validators.required, Validators.min(1)]],
    pochoclo_id: ['', Validators.required],
    cantidad_pochoclo: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
    bebida_id: ['', Validators.required],
    cantidad_bebida: [1, [Validators.required, Validators.min(1), Validators.max(10)]],
    activo: [true]
  });

  ngOnInit() {
    void this.cargarDatos();
  }

  async cargarDatos() {
    this.cargando.set(true);
    const [combosResultado, productosResultado] = await Promise.all([
      this.combosService.obtenerCombos(false),
      this.productosService.obtenerProductos()
    ]);

    if (combosResultado.error || productosResultado.error) {
      this.mensajeError.set('No se pudieron cargar los datos de combos.');
      this.cargando.set(false);
      return;
    }

    const productos = (productosResultado.data ?? []) as unknown as Producto[];
    this.combos.set((combosResultado.data ?? []) as unknown as Combo[]);
    this.pochoclos.set(productos.filter(producto => producto.categorias_productos?.nombre === 'Pochoclos'));
    this.bebidas.set(productos.filter(producto => producto.categorias_productos?.nombre === 'Bebidas'));
    this.cargando.set(false);
  }

  async guardar() {
    if (this.formulario.invalid || this.guardando()) {
      this.formulario.markAllAsTouched();
      this.mensajeError.set('Completá correctamente todos los campos.');
      return;
    }

    this.guardando.set(true);
    this.mensajeError.set('');
    this.mensajeExito.set('');
    const valores = this.formulario.getRawValue();
    const formulario: ComboFormulario = {
      ...valores,
      precio_fijo: Number(valores.precio_fijo),
      cantidad_pochoclo: Number(valores.cantidad_pochoclo),
      cantidad_bebida: Number(valores.cantidad_bebida)
    };

    const resultado = this.editandoId()
      ? await this.combosService.actualizarCombo(this.editandoId()!, formulario)
      : await this.combosService.crearCombo(formulario);

    if (resultado.error) {
      this.mensajeError.set(resultado.error.message);
      this.guardando.set(false);
      return;
    }

    this.mensajeExito.set(this.editandoId() ? 'Combo actualizado.' : 'Combo creado.');
    this.cancelarEdicion();
    await this.cargarDatos();
    this.guardando.set(false);
  }

  editar(combo: Combo) {
    const pochoclo = combo.combo_productos.find(item => item.productos.categorias_productos?.nombre === 'Pochoclos');
    const bebida = combo.combo_productos.find(item => item.productos.categorias_productos?.nombre === 'Bebidas');
    this.editandoId.set(combo.id);
    this.formulario.patchValue({
      nombre: combo.nombre,
      precio_fijo: Number(combo.precio_fijo),
      activo: combo.activo,
      pochoclo_id: pochoclo?.producto_id ?? '',
      cantidad_pochoclo: pochoclo?.cantidad ?? 1,
      bebida_id: bebida?.producto_id ?? '',
      cantidad_bebida: bebida?.cantidad ?? 1
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarEdicion() {
    this.editandoId.set(null);
    this.formulario.reset({
      nombre: '',
      precio_fijo: 0,
      pochoclo_id: '',
      cantidad_pochoclo: 1,
      bebida_id: '',
      cantidad_bebida: 1,
      activo: true
    });
  }

  async cambiarEstado(combo: Combo) {
    const resultado = await this.combosService.cambiarEstado(combo.id, !combo.activo);
    if (resultado.error) {
      this.mensajeError.set(resultado.error.message);
      return;
    }
    await this.cargarDatos();
  }

  formatearPrecio(valor: number) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(valor));
  }
}
