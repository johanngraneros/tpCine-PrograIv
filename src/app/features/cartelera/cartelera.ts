import { Component, effect, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PeliculasService } from '../../core/services/peliculas.service';
import { SearchBar } from '../../shared/components/search-bar/search-bar';

@Component({
  selector: 'app-cartelera',
  imports: [RouterLink, SearchBar],
  templateUrl: './cartelera.html',
  styleUrl: './cartelera.css'
})
export class Cartelera implements OnInit {
  private peliculasService = inject(PeliculasService);

  peliculas = signal<any[]>([]);
  generos = signal<any[]>([]);
  cargando = signal(true);
  versionesPorPelicula = signal<Record<string, string[]>>({});

  textoBusqueda = signal('');
  generoSeleccionado = signal<string | null>(null);

  constructor() {
    // Se ejecuta al crear el componente y cada vez que cambia
    // textoBusqueda o generoSeleccionado — no hace falta llamar
    // buscar() manualmente desde el template.
    effect(() => {
      this.buscar(this.textoBusqueda(), this.generoSeleccionado());
    });
  }

  async ngOnInit() {
    const { data: generosData } = await this.peliculasService.getGeneros();
    this.generos.set(generosData ?? []);
  }

  private async buscar(texto: string, generoId: string | null) {
    this.cargando.set(true);
    const { data, error } = await this.peliculasService.buscar(texto, generoId);
    if (!error && data) {
      this.peliculas.set(data);
      const versiones = await this.peliculasService.getFormatosDisponibles(
        data.map(pelicula => pelicula.id)
      );
      if (!versiones.error) {
        const agrupadas: Record<string, Set<string>> = {};
        for (const funcion of versiones.data ?? []) {
          agrupadas[funcion.pelicula_id] ??= new Set<string>();
          agrupadas[funcion.pelicula_id].add(`${funcion.formato} · ${funcion.idioma}`);
        }
        this.versionesPorPelicula.set(Object.fromEntries(
          Object.entries(agrupadas).map(([id, valores]) => [id, [...valores]])
        ));
      }
    }
    this.cargando.set(false);
  }

  versionesDe(peliculaId: string) {
    return this.versionesPorPelicula()[peliculaId] ?? [];
  }
}
