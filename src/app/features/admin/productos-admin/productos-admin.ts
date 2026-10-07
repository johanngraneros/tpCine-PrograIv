import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CategoriaProducto, Producto, ProductoFormulario } from '../../../core/models/producto.interface';
import { AdminProductosService } from '../../../core/services/admin-productos.service';
import { traducirError } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-productos-admin',
  imports: [
    ReactiveFormsModule,
    RouterLink
  ],
  templateUrl: './productos-admin.html',
  styleUrl: './productos-admin.css'
})
export class ProductosAdmin implements OnInit {
  private formBuilder = inject(FormBuilder);

  private adminProductosService =
    inject(AdminProductosService);

  productos = signal<Producto[]>([]);
  categorias = signal<CategoriaProducto[]>([]);

  cargando = signal(true);
  guardando = signal(false);

  productoEditandoId =
    signal<string | null>(null);

  archivoSeleccionado =
    signal<File | null>(null);

  imagenOriginal =
    signal<string | null>(null);

  vistaPrevia = signal('');

  mensajeError = signal('');
  confirmandoEliminacionId = signal<string | null>(null);
  mensajeExito = signal('');

  formulario = this.formBuilder.nonNullable.group({
    categoria_id: [
      '',
      Validators.required
    ],
    nombre: [
      '',
      [
        Validators.required,
        Validators.maxLength(80)
      ]
    ],
    descripcion: [
      '',
      Validators.maxLength(300)
    ],
    precio: [
      0,
      [
        Validators.required,
        Validators.min(0)
      ]
    ],
    costo_puntos: [
      1,
      [
        Validators.required,
        Validators.min(1)
      ]
    ],
    activo: [true],
    imagen_url: ['']
  });

  ngOnInit() {
    void this.cargarDatos();
  }

  async cargarDatos() {
    this.cargando.set(true);
    this.mensajeError.set('');

    const [
      productosResultado,
      categoriasResultado
    ] = await Promise.all([
      this.adminProductosService
        .obtenerProductos(),

      this.adminProductosService
        .obtenerCategorias()
    ]);

    if (productosResultado.error) {
      console.error(
        productosResultado.error
      );

      this.mensajeError.set(
        'No se pudieron cargar los productos.'
      );
    } else {
      this.productos.set((productosResultado.data ?? []) as unknown as Producto[]);
    }

    if (categoriasResultado.error) {
      console.error(
        categoriasResultado.error
      );

      this.mensajeError.set(
        'No se pudieron cargar las categorías.'
      );
    } else {
      this.categorias.set((categoriasResultado.data ?? []) as unknown as CategoriaProducto[]);
    }

    this.cargando.set(false);
  }

  seleccionarImagen(evento: Event) {
    const input =
      evento.target as HTMLInputElement;

    const archivo =
      input.files?.[0] ?? null;

    this.mensajeError.set('');

    if (!archivo) {
      return;
    }

    if (!archivo.type.startsWith('image/')) {
      this.mensajeError.set(
        'Seleccioná un archivo de imagen válido.'
      );

      input.value = '';
      return;
    }

    const limiteBytes =
      5 * 1024 * 1024;

    if (archivo.size > limiteBytes) {
      this.mensajeError.set(
        'La imagen no puede superar los 5 MB.'
      );

      input.value = '';
      return;
    }

    this.liberarVistaPrevia();

    this.archivoSeleccionado.set(archivo);

    this.vistaPrevia.set(
      URL.createObjectURL(archivo)
    );
  }

  quitarImagen() {
    this.liberarVistaPrevia();

    this.archivoSeleccionado.set(null);
    this.vistaPrevia.set('');

    this.formulario.controls
      .imagen_url.setValue('');
  }

  async guardar() {
    if (this.guardando()) {
      return;
    }

    this.mensajeError.set('');
    this.mensajeExito.set('');

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();

      this.mensajeError.set(
        'Revisá los campos del formulario.'
      );

      return;
    }

    this.guardando.set(true);

    const archivo =
      this.archivoSeleccionado();

    const imagenAnterior =
      this.imagenOriginal();

    let imagenUrl =
      this.formulario.controls
        .imagen_url.value.trim() ||
      null;

    let imagenNuevaSubida:
      string | null = null;

    if (archivo) {
      const subida =
        await this.adminProductosService
          .subirImagen(archivo);

      if (subida.error || !subida.data) {
        console.error(subida.error);

        this.mensajeError.set(traducirError(subida.error, 'No se pudo subir la imagen. Intentá nuevamente.'));

        this.guardando.set(false);
        return;
      }

      imagenUrl =
        subida.data.imagenUrl;

      imagenNuevaSubida =
        subida.data.imagenUrl;
    }

    const valores =
      this.formulario.getRawValue();

    const productoFormulario:
      ProductoFormulario = {
        categoria_id:
          valores.categoria_id,

        nombre:
          valores.nombre,

        descripcion:
          valores.descripcion,

        precio:
          Number(valores.precio),

        costo_puntos:
          Number(valores.costo_puntos),

        activo:
          valores.activo,

        imagen_url:
          imagenUrl ?? ''
      };

    const productoId =
      this.productoEditandoId();

    let resultado;

    if (productoId) {
      resultado =
        await this.adminProductosService
          .actualizarProducto(
            productoId,
            productoFormulario,
            imagenUrl
          );
    } else {
      resultado =
        await this.adminProductosService
          .crearProducto(
            productoFormulario,
            imagenUrl
          );
    }

    if (resultado.error) {
      console.error(resultado.error);

      if (imagenNuevaSubida) {
        await this.adminProductosService
          .eliminarImagen(
            imagenNuevaSubida
          );
      }

      this.mensajeError.set(traducirError(resultado.error, 'No se pudo guardar el producto. Intentá nuevamente.'));

      this.guardando.set(false);
      return;
    }

    if (
      productoId &&
      imagenAnterior &&
      imagenAnterior !== imagenUrl
    ) {
      await this.adminProductosService
        .eliminarImagen(
          imagenAnterior
        );
    }

    this.mensajeExito.set(
      productoId
        ? 'Producto actualizado correctamente.'
        : 'Producto creado correctamente.'
    );

    this.cancelarEdicion();

    await this.cargarDatos();

    this.guardando.set(false);
  }

  editar(producto: Producto) {
    this.productoEditandoId.set(
      producto.id
    );

    this.imagenOriginal.set(
      producto.imagen_url
    );

    this.vistaPrevia.set(
      producto.imagen_url ?? ''
    );

    this.archivoSeleccionado.set(null);

    this.formulario.patchValue({
      categoria_id:
        producto.categoria_id ?? '',

      nombre:
        producto.nombre,

      descripcion:
        producto.descripcion ?? '',

      precio:
        Number(producto.precio),

      costo_puntos:
        Number(
          producto.costo_puntos ?? 1
        ),

      activo:
        producto.activo,

      imagen_url:
        producto.imagen_url ?? ''
    });

    this.mensajeError.set('');
    this.mensajeExito.set('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  cancelarEdicion() {
    this.liberarVistaPrevia();

    this.productoEditandoId.set(null);
    this.archivoSeleccionado.set(null);
    this.imagenOriginal.set(null);
    this.vistaPrevia.set('');

    this.formulario.reset({
      categoria_id: '',
      nombre: '',
      descripcion: '',
      precio: 0,
      costo_puntos: 1,
      activo: true,
      imagen_url: ''
    });
  }

  async cambiarEstado(
    producto: Producto
  ) {
    this.mensajeError.set('');
    this.mensajeExito.set('');

    const { error } =
      await this.adminProductosService
        .cambiarEstado(
          producto.id,
          !producto.activo
        );

    if (error) {
      console.error(error);

      this.mensajeError.set(traducirError(error, 'No se pudo eliminar el producto. Intentá nuevamente.'));

      return;
    }

    this.mensajeExito.set(
      producto.activo
        ? 'Producto desactivado.'
        : 'Producto activado.'
    );

    await this.cargarDatos();
  }

  async eliminar(producto: Producto) {
    if (this.confirmandoEliminacionId() !== producto.id) {
      this.confirmandoEliminacionId.set(producto.id);
      return;
    }
    this.confirmandoEliminacionId.set(null);

    this.mensajeError.set('');
    this.mensajeExito.set('');

    const { error } =
      await this.adminProductosService
        .eliminarProducto(
          producto.id
        );

    if (error) {
      console.error(error);

      this.mensajeError.set(
        'No se puede eliminar el producto. ' +
        'Puede tener canjes relacionados.'
      );

      return;
    }

    if (producto.imagen_url) {
      await this.adminProductosService
        .eliminarImagen(
          producto.imagen_url
        );
    }

    if (
      this.productoEditandoId() ===
      producto.id
    ) {
      this.cancelarEdicion();
    }

    this.mensajeExito.set(
      'Producto eliminado correctamente.'
    );

    await this.cargarDatos();
  }

  formatearPrecio(valor: number) {
    return new Intl.NumberFormat(
      'es-AR',
      {
        style: 'currency',
        currency: 'ARS'
      }
    ).format(Number(valor));
  }

  private liberarVistaPrevia() {
    const vistaActual =
      this.vistaPrevia();

    if (
      vistaActual.startsWith('blob:')
    ) {
      URL.revokeObjectURL(
        vistaActual
      );
    }
  }
}
