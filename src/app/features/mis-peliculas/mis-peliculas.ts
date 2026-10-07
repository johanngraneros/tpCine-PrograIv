import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { startWith } from 'rxjs';
import { MiCompra } from '../../core/models/mi-compra.interface';
import { MiPelicula, MiPeliculaResena } from '../../core/models/mi-pelicula.interface';
import { AuthService } from '../../core/services/auth.service';
import { MisPeliculasService } from '../../core/services/mis-peliculas.service';

interface ResenaUsuario {
  pelicula_id: string;
  estrellas: number;
  comentario: string;
  fecha: string;
}

@Component({
  selector: 'app-mis-peliculas',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './mis-peliculas.html',
  styleUrl: './mis-peliculas.css'
})
export class MisPeliculas implements OnInit {
  private authService = inject(AuthService);
  private misPeliculasService = inject(MisPeliculasService);

  busquedaControl = new FormControl('', { nonNullable: true });
  peliculas = signal<MiPelicula[]>([]);
  cargando = signal(true);
  mensajeError = signal('');

  private busqueda = toSignal(
    this.busquedaControl.valueChanges.pipe(
      startWith(this.busquedaControl.value)
    ),
    { initialValue: '' }
  );

  peliculasFiltradas = computed(() => {
    const texto = this.busqueda().trim().toLocaleLowerCase('es');
    return texto
      ? this.peliculas().filter(pelicula =>
          pelicula.titulo.toLocaleLowerCase('es').includes(texto)
        )
      : this.peliculas();
  });

  ngOnInit() {
    void this.cargarPeliculas();
  }

  private async cargarPeliculas() {
    const usuario = this.authService.currentUser();

    if (!usuario) {
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.mensajeError.set('');

    const resultado = await this.misPeliculasService.obtenerHistorial(usuario.id);

    if (resultado.compras.error || resultado.resenas.error) {
      this.mensajeError.set('No se pudo cargar tu historial de películas.');
      this.cargando.set(false);
      return;
    }

    const compras = (resultado.compras.data ?? []) as unknown as MiCompra[];
    const resenas = (resultado.resenas.data ?? []) as ResenaUsuario[];

    this.peliculas.set(this.armarHistorial(compras, resenas));
    this.cargando.set(false);
  }

  private armarHistorial(
    compras: MiCompra[],
    resenas: ResenaUsuario[]
  ): MiPelicula[] {
    const ahora = Date.now();
    const resenasPorPelicula = new Map(
      resenas.map(resena => [resena.pelicula_id, resena])
    );
    const historial = new Map<string, MiPelicula>();

    for (const compra of compras) {
      if (compra.estado !== 'confirmada') continue;

      for (const entrada of compra.entradas) {
        const fechaFuncion = entrada.funciones.fecha_hora;
        const version = `${entrada.funciones.formato} · ${entrada.funciones.idioma}`;

        if (
          entrada.estado === 'cancelada' ||
          new Date(fechaFuncion).getTime() > ahora
        ) {
          continue;
        }

        const pelicula = entrada.funciones.peliculas;
        const existente = historial.get(pelicula.id);

        if (existente) {
          existente.cantidadEntradas += 1;

          if (!existente.funcionesVistas.includes(fechaFuncion)) {
            existente.funcionesVistas.push(fechaFuncion);
          }

          if (!existente.versionesVistas.includes(version)) {
            existente.versionesVistas.push(version);
          }

          if (
            new Date(fechaFuncion).getTime() >
            new Date(existente.ultimaFuncion).getTime()
          ) {
            existente.ultimaFuncion = fechaFuncion;
          }
          continue;
        }

        const resena = resenasPorPelicula.get(pelicula.id);
        historial.set(pelicula.id, {
          id: pelicula.id,
          titulo: pelicula.titulo,
          imagenUrl: pelicula.imagen_url,
          ultimaFuncion: fechaFuncion,
          funcionesVistas: [fechaFuncion],
          versionesVistas: [version],
          cantidadEntradas: 1,
          resena: resena ? this.mapearResena(resena) : null
        });
      }
    }

    return [...historial.values()]
      .map(pelicula => ({
        ...pelicula,
        funcionesVistas: [...pelicula.funcionesVistas].sort(
          (a, b) => new Date(b).getTime() - new Date(a).getTime()
        )
      }))
      .sort(
        (a, b) =>
          new Date(b.ultimaFuncion).getTime() -
          new Date(a.ultimaFuncion).getTime()
      );
  }

  private mapearResena(resena: ResenaUsuario): MiPeliculaResena {
    return {
      estrellas: Number(resena.estrellas),
      comentario: resena.comentario,
      fecha: resena.fecha
    };
  }

  estrellas(cantidad: number) {
    return '★'.repeat(cantidad) + '☆'.repeat(5 - cantidad);
  }

  formatearFecha(fecha: string) {
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'long',
      timeStyle: 'short'
    }).format(new Date(fecha));
  }
}
