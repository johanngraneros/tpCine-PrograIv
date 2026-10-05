import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormRecord, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FuncionDetalle } from '../../core/models/funcion.interface';
import { Combo, ComboSeleccionadoCompra } from '../../core/models/combo.interface';
import { ProductoSeleccionadoCompra } from '../../core/models/producto-compra.interface';
import { Canje, Producto } from '../../core/models/producto.interface';
import { AuthService } from '../../core/services/auth.service';
import { ButacasService } from '../../core/services/butacas.service';
import { CarritoService } from '../../core/services/carrito.service';
import { ComprasService } from '../../core/services/compras.service';
import { CombosService } from '../../core/services/combos.service';
import { ProductosService } from '../../core/services/productos.service';
import { EntradaDocumentoService } from '../../core/services/entrada-documento.service';

interface EntradaInvitado {
  entrada_id: string;
  qr_code: string;
  pelicula: string;
  fecha_hora: string;
  sala: string;
  fila: string;
  numero: number;
  tipo: string;
}

function fechaNacimientoValida(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const fecha = new Date(`${control.value}T00:00:00`);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (Number.isNaN(fecha.getTime()) || fecha > hoy || fecha.getFullYear() < 1900) {
    return { fechaNacimientoInvalida: true };
  }
  return null;
}

@Component({
  imports: [
    DatePipe,
    ReactiveFormsModule
  ],
  selector: 'app-compra',
  styleUrl: './compra.css',
  templateUrl: './compra.html'
})
export class Compra implements OnInit {
  readonly fechaMaximaNacimiento = new Date().toISOString().slice(0, 10);
  carrito = inject(CarritoService);

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private butacasService = inject(ButacasService);
  private comprasService = inject(ComprasService);
  authService = inject(AuthService);
  private productosService = inject(ProductosService);
  private combosService = inject(CombosService);
  private formBuilder = inject(FormBuilder);
  private entradaDocumento = inject(EntradaDocumentoService);

  funcionId = '';

  datosFuncion =
    signal<FuncionDetalle | null>(null);

  productosCandy =
    signal<Producto[]>([]);

  combos = signal<Combo[]>([]);
  canjesAplicables = signal<Canje[]>([]);
  canjeSeleccionadoId = signal<string | null>(null);

  formularioProductos =
    new FormRecord<FormControl<number>>({});

  formularioCombos =
    new FormRecord<FormControl<number>>({});

  formularioInvitado = this.formBuilder.nonNullable.group({
    nombre: ['', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(100)
    ]],
    email: ['', [
      Validators.required,
      Validators.email,
      Validators.maxLength(160)
    ]],
    fechaNacimiento: ['', [Validators.required, fechaNacimientoValida]]
  });

  creditoDisponible = signal(0);
  usarCredito = signal(false);
  cupon = signal<{
    tipo: string | null;
    porcentaje: number;
  }>({ tipo: null, porcentaje: 0 });

  procesando = signal(false);
  mensajeError = signal('');

  compraConfirmada =
    signal<string | null>(null);
  entradasInvitado = signal<EntradaInvitado[]>([]);
  generandoPdf = signal<string | null>(null);
  generandoTodas = signal(false);

  async ngOnInit() {
    this.funcionId =
      this.route.snapshot.paramMap.get(
        'funcionId'
      )!;

    if (
      this.carrito.butacasParaComprar().size === 0
    ) {
      await this.router.navigate([
        '/funcion',
        this.funcionId,
        'butacas'
      ]);

      return;
    }

    const { data, error } =
      await this.butacasService.getFuncion(
        this.funcionId
      );

    if (error) {
      this.mensajeError.set(
        'No se pudo cargar la función'
      );

      return;
    }

    if (data) {
      this.datosFuncion.set(
        data as unknown as FuncionDetalle
      );
    }

    await Promise.all([
      this.cargarCredito(),
      this.cargarCupon(),
      this.cargarCanjesAplicables()
    ]);
    await Promise.all([
      this.cargarProductosCandy(),
      this.cargarCombos()
    ]);
  }

  private async cargarCanjesAplicables() {
    const usuario = this.authService.currentUser();
    if (!usuario) return;

    const { data, error } = await this.productosService
      .obtenerCanjesAplicables(usuario.id);

    if (error) {
      console.error(error);
      return;
    }

    const canjes = (data ?? []) as unknown as Canje[];
    this.canjesAplicables.set(
      canjes.filter(canje =>
        ['Combos', 'Entradas'].includes(
          canje.productos.categorias_productos?.nombre ?? ''
        )
      )
    );
  }

  cambiarCanje(canjeId: string) {
    const seleccionado = this.canjeSeleccionadoId() !== canjeId;
    this.canjeSeleccionadoId.set(seleccionado ? canjeId : null);

    if (seleccionado) {
      this.limpiarComponentesIncluidos();
    }
  }

  private limpiarComponentesIncluidos() {
    for (const producto of this.productosCandy()) {
      if (['bebida grande', 'pochoclo grande'].includes(producto.nombre.toLowerCase())) {
        this.formularioProductos.controls[producto.id]?.setValue(0);
      }
    }
  }

  canjeSeleccionado() {
    return this.canjesAplicables().find(canje => canje.id === this.canjeSeleccionadoId()) ?? null;
  }

  private async cargarCombos() {
    const { data, error } =
      await this.combosService.obtenerCombos();

    if (error) {
      console.error(error);
      this.mensajeError.set('No se pudieron cargar los combos del Candy Bar.');
      return;
    }

    const combos = (data ?? []) as unknown as Combo[];
    this.combos.set(combos);

    for (const combo of combos) {
      this.formularioCombos.addControl(
        combo.id,
        new FormControl(0, {
          nonNullable: true,
          validators: [Validators.min(0), Validators.max(10)]
        })
      );
    }
  }

  private async cargarCredito() {
    const usuario =
      this.authService.currentUser();

    if (!usuario) {
      return;
    }

    const { data, error } =
      await this.authService.getPerfil(
        usuario.id
      );

    if (error) {
      console.error(error);
      return;
    }

    this.creditoDisponible.set(
      Number(data?.credito ?? 0)
    );
  }

  private async cargarCupon() {
    if (!this.authService.currentUser()) {
      return;
    }

    const { data, error } =
      await this.comprasService.obtenerCuponDisponible();

    if (error || !data) {
      return;
    }

    const cupon = data as {
      tipo: string | null;
      porcentaje: number;
    };

    this.cupon.set({
      tipo: cupon.tipo,
      porcentaje: Number(cupon.porcentaje ?? 0)
    });
  }

  private async cargarProductosCandy() {
    const { data, error } =
      await this.productosService
        .obtenerProductosCandy();

    if (error) {
      console.error(error);

      this.mensajeError.set(
        'No se pudieron cargar los productos del Candy Bar.'
      );

      return;
    }

    const productos =
      (data ?? []) as unknown as Producto[];

    this.productosCandy.set(productos);

    for (const producto of productos) {
      this.formularioProductos.addControl(
        producto.id,
        new FormControl(
          0,
          {
            nonNullable: true,
            validators: [
              Validators.min(0),
              Validators.max(20)
            ]
          }
        )
      );
    }
  }

  cambiarUsoCredito() {
    this.usarCredito.update(
      valor => !valor
    );
  }

  cantidadProducto(productoId: string) {
    return (
      this.formularioProductos
        .controls[productoId]?.value ?? 0
    );
  }

  aumentarProducto(productoId: string) {
    const control =
      this.formularioProductos
        .controls[productoId];

    if (!control || control.value >= 20) {
      return;
    }

    control.setValue(control.value + 1);
  }

  disminuirProducto(productoId: string) {
    const control =
      this.formularioProductos
        .controls[productoId];

    if (!control || control.value <= 0) {
      return;
    }

    control.setValue(control.value - 1);
  }

  cantidadCombo(comboId: string) {
    return this.formularioCombos.controls[comboId]?.value ?? 0;
  }

  cambiarCantidadCombo(comboId: string, cambio: number) {
    const control = this.formularioCombos.controls[comboId];
    if (!control) return;
    control.setValue(Math.max(0, Math.min(10, control.value + cambio)));
  }

  subtotalEntradas() {
    const funcion = this.datosFuncion();

    if (!funcion) {
      return 0;
    }

    if (this.preventaActiva()) {
      return this.carrito.butacasSeleccionadas().length *
        Number(funcion.precio_preventa);
    }

    return this.carrito.calcularTotal(funcion.precio, funcion.precio_vip);
  }

  preventaActiva() {
    const funcion = this.datosFuncion();
    if (!funcion?.precio_preventa || !funcion.fecha_fin_preventa) return false;

    const ahora = Date.now();
    const fechaFuncion = new Date(funcion.fecha_hora).getTime();
    const finPreventa = new Date(funcion.fecha_fin_preventa).getTime();
    const inicioPreventa = fechaFuncion - 7 * 24 * 60 * 60 * 1000;

    return ahora >= inicioPreventa && ahora <= finPreventa;
  }

  subtotalProductos() {
    return this.productosCandy().reduce(
      (total, producto) => {
        const cantidad =
          this.cantidadProducto(
            producto.id
          );

        return (
          total +
          Number(producto.precio) *
          cantidad
        );
      },
      0
    );
  }

  subtotalCombos() {
    return this.combos().reduce(
      (total, combo) => total + Number(combo.precio_fijo) * this.cantidadCombo(combo.id),
      0
    );
  }

  subtotalCompra() {
    return (
      this.subtotalEntradas() +
      this.subtotalProductos() +
      this.subtotalCombos()
    );
  }

  valorProductosIncluidos() {
    if (!this.canjeSeleccionado()) return 0;

    return this.productosCandy()
      .filter(producto =>
        ['bebida grande', 'pochoclo grande'].includes(producto.nombre.toLowerCase())
      )
      .reduce((total, producto) => total + Number(producto.precio), 0);
  }

  subtotalMostrado() {
    return this.subtotalCompra() + this.valorProductosIncluidos();
  }

  descuentoAplicado() {
    return this.subtotalCompra() * this.cupon().porcentaje / 100;
  }

  descuentoCanje() {
    const funcion = this.datosFuncion();
    if (!funcion || !this.canjeSeleccionado()) return 0;
    const precioEntrada = this.preventaActiva()
      ? Number(funcion.precio_preventa)
      : Number(funcion.precio);
    const descuentoEntrada = Math.min(
      precioEntrada,
      Math.max(this.subtotalCompra() - this.descuentoAplicado(), 0)
    );
    return descuentoEntrada + this.valorProductosIncluidos();
  }

  combosSeleccionados(): ComboSeleccionadoCompra[] {
    return this.combos()
      .filter(combo => this.cantidadCombo(combo.id) > 0)
      .map(combo => ({
        combo_id: combo.id,
        cantidad: this.cantidadCombo(combo.id)
      }));
  }

  creditoAplicado() {
    if (!this.usarCredito()) {
      return 0;
    }

    return Math.min(
      this.creditoDisponible(),
      this.subtotalMostrado() - this.descuentoAplicado() - this.descuentoCanje()
    );
  }

  totalAPagar() {
    return (
      this.subtotalMostrado() -
      this.descuentoAplicado() -
      this.descuentoCanje() -
      this.creditoAplicado()
    );
  }

  productosSeleccionados():
    ProductoSeleccionadoCompra[] {
    return this.productosCandy()
      .filter(
        producto =>
          this.cantidadProducto(
            producto.id
          ) > 0
      )
      .map(
        producto => ({
          producto_id: producto.id,
          cantidad:
            this.cantidadProducto(
              producto.id
            )
        })
      );
  }

  formatearPrecio(valor: number) {
    return new Intl.NumberFormat(
      'es-AR',
      {
        style: 'currency',
        currency: 'ARS'
      }
    ).format(valor);
  }

  async confirmarCompra() {
    if (this.procesando()) {
      return;
    }

    if (this.formularioProductos.invalid || this.formularioCombos.invalid) {
      this.mensajeError.set(
        'Revisá las cantidades de los productos.'
      );

      return;
    }

    const esInvitado = !this.authService.currentUser();

    if (esInvitado && this.formularioInvitado.invalid) {
      this.formularioInvitado.markAllAsTouched();
      this.mensajeError.set(
        'Completá tu nombre y un correo electrónico válido.'
      );
      return;
    }

    const butacaIds = this.carrito
      .butacasSeleccionadas()
      .map(butaca => butaca.id);

    if (butacaIds.length === 0) {
      this.mensajeError.set(
        'No seleccionaste ninguna butaca'
      );

      return;
    }

    this.procesando.set(true);
    this.mensajeError.set('');

    const productos = this.productosSeleccionados();
    const combos = this.combosSeleccionados();
    const canjeId = this.canjeSeleccionadoId();
    const resultado = esInvitado
      ? await this.comprasService.confirmarCompraInvitado(
          this.funcionId,
          butacaIds,
          this.formularioInvitado.controls.nombre.value.trim(),
          this.formularioInvitado.controls.email.value.trim().toLowerCase(),
          this.formularioInvitado.controls.fechaNacimiento.value,
          productos,
          combos
        )
      : canjeId
      ? await this.comprasService.confirmarCompraConCanje(
          this.funcionId,
          butacaIds,
          canjeId,
          this.usarCredito(),
          productos,
          combos
        )
      : await this.comprasService.confirmarCompra(
          this.funcionId,
          butacaIds,
          this.usarCredito(),
          productos,
          combos
        );

    const { data, error } = resultado;

    if (error) {
      this.mensajeError.set(
        error.message
      );

      this.procesando.set(false);
      return;
    }

    this.compraConfirmada.set(data);
    if (esInvitado && data) {
      const email = this.formularioInvitado.controls.email.value.trim().toLowerCase();
      const comprobante = await this.comprasService.obtenerEntradasInvitado(data, email);
      if (comprobante.error) {
        this.mensajeError.set('La compra se confirmó, pero no se pudo cargar el comprobante. Guardá el número de compra.');
      } else {
        this.entradasInvitado.set((comprobante.data ?? []) as EntradaInvitado[]);
      }
    }
    this.carrito.vaciarCarrito();
    this.procesando.set(false);
  }

  async descargarEntradaInvitado(entrada: EntradaInvitado) {
    this.generandoPdf.set(entrada.entrada_id);
    try {
      await this.entradaDocumento.descargarPdf({
        qrCode: entrada.qr_code,
        pelicula: entrada.pelicula,
        fechaHora: new Intl.DateTimeFormat('es-AR', {
          dateStyle: 'long', timeStyle: 'short'
        }).format(new Date(entrada.fecha_hora)),
        sala: entrada.sala,
        fila: entrada.fila,
        numeroButaca: entrada.numero,
        tipoButaca: entrada.tipo,
        cliente: this.formularioInvitado.controls.nombre.value.trim(),
        compraId: this.compraConfirmada() ?? ''
      });
    } finally {
      this.generandoPdf.set(null);
    }
  }

  async descargarEntradasInvitado() {
    const entradas = this.entradasInvitado();
    if (!entradas.length || this.generandoTodas()) return;

    this.generandoTodas.set(true);
    try {
      await this.entradaDocumento.descargarPdfMultiple(
        entradas.map(entrada => ({
          qrCode: entrada.qr_code,
          pelicula: entrada.pelicula,
          fechaHora: new Intl.DateTimeFormat('es-AR', {
            dateStyle: 'long', timeStyle: 'short'
          }).format(new Date(entrada.fecha_hora)),
          sala: entrada.sala,
          fila: entrada.fila,
          numeroButaca: entrada.numero,
          tipoButaca: entrada.tipo,
          cliente: this.formularioInvitado.controls.nombre.value.trim(),
          compraId: this.compraConfirmada() ?? ''
        }))
      );
    } finally {
      this.generandoTodas.set(false);
    }
  }
}
