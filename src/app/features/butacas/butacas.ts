import {Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { ButacasService } from '../../core/services/butacas.service';
import { CarritoService } from '../../core/services/carrito.service';

import { Butaca, ButacaOcupada, FilaButacas } from '../../core/models/butaca.interface';

import {FuncionDetalle} from '../../core/models/funcion.interface';

@Component({
  imports: [RouterLink],
  selector: 'app-butacas',
  styleUrl: './butacas.css',
  templateUrl: './butacas.html',
})
export class Butacas implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private butacasService = inject(ButacasService);

  carrito = inject(CarritoService);

  private canal: RealtimeChannel | null = null;

  funcionId = '';

  datosFuncion = signal<FuncionDetalle | null>(null);
  filasAgrupadas = signal<FilaButacas[]>([]);
  butacasOcupadas = signal<Set<string>>(new Set());

  cargando = signal(true);

  async ngOnInit() {
    this.carrito.vaciarCarrito();

    this.funcionId =
      this.route.snapshot.paramMap.get('funcionId')!;

    await this.cargarTodo();

    this.canal = this.butacasService.suscribirCambios(
      this.funcionId,
      () => {
        void this.recargarOcupadas();
      }
    );
  }

  private async cargarTodo() {
    this.cargando.set(true);

    const {
      data: funcionData,
      error: funcionError
    } = await this.butacasService.getFuncion(this.funcionId);

    if (funcionError) {
      console.error(
        'Error al cargar la función:',
        funcionError
      );

      this.cargando.set(false);
      return;
    }

    if (!funcionData) {
      this.cargando.set(false);
      return;
    }

    const funcion =
      funcionData as unknown as FuncionDetalle;

    this.datosFuncion.set(funcion);

    const {
      data: butacasData,
      error: butacasError
    } = await this.butacasService.getButacasDeSalas(
      funcion.salas.id
    );

    if (butacasError) {
      console.error(
        'Error al cargar las butacas:',
        butacasError
      );

      this.cargando.set(false);
      return;
    }

    const mapaButacas =
      new Map<string, Butaca[]>();

    (butacasData ?? []).forEach((butaca: Butaca) => {
      if (!mapaButacas.has(butaca.fila)) {
        mapaButacas.set(butaca.fila, []);
      }

      mapaButacas.get(butaca.fila)!.push(butaca);
    });

    const filas: FilaButacas[] =
      Array.from(mapaButacas.entries()).map(
        ([fila, butacas]) => ({
          fila,
          butacas
        })
      );

    this.filasAgrupadas.set(filas);

    await this.recargarOcupadas();

    this.cargando.set(false);
  }

  private async recargarOcupadas() {
    const {
      data: ocupadasData,
      error
    } = await this.butacasService.getButacasOcupadas(
      this.funcionId
    );

    if (error) {
      console.error(
        'Error al cargar las butacas ocupadas:',
        error
      );
      return;
    }

    const idsOcupados = (ocupadasData ?? []).map(
      (entrada: ButacaOcupada) =>
        entrada.butaca_id
    );

    this.butacasOcupadas.set(
      new Set(idsOcupados)
    );
  }

  toggleButaca(butaca: Butaca) {
    if (this.butacasOcupadas().has(butaca.id)) {
      return;
    }

    this.carrito.toggleButacaComprada(butaca);
  }

  ngOnDestroy() {
    if (this.canal) {
      void this.butacasService.cerrarCanal(
        this.canal
      );
    }
  }
}
