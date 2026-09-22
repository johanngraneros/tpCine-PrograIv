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
    }
    this.cargando.set(false);
  }
}