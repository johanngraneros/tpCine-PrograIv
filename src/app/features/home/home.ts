import { Component, inject, signal, OnInit } from '@angular/core';
import { PeliculasService } from '../../core/services/peliculas.service';

@Component({
  imports: [],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home implements OnInit {
    private peliculasService = inject(PeliculasService);

  peliculasDestacadas = signal<any[]>([]);
  cargando = signal(true);

  async ngOnInit() {
    const { data, error } = await this.peliculasService.getTop3Vendidas();
    if (!error && data) {
      this.peliculasDestacadas.set(data);
    }
    this.cargando.set(false);
  }
}
