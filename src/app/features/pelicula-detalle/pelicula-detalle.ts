import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeliculasService } from '../../core/services/peliculas.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-pelicula-detalle',
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './pelicula-detalle.html',
  styleUrl: './pelicula-detalle.css'
})
export class PeliculaDetalle implements OnInit {
  private route = inject(ActivatedRoute);
  private peliculasService = inject(PeliculasService);
  auth = inject(AuthService); // público, lo usamos desde el template

  peliculaId = '';
  pelicula = signal<any>(null);
  funciones = signal<any[]>([]);
  resenas = signal<any[]>([]);
  cargando = signal(true);

  // formulario de nueva reseña
  nuevaEstrellas = 5;
  nuevoComentario = '';
  enviandoResena = signal(false);
  errorResena = signal('');

  async ngOnInit() {
    this.peliculaId = this.route.snapshot.paramMap.get('id')!;
    await this.cargarTodo();
  }

  private async cargarTodo() {
    this.cargando.set(true);
    const [peliculaResult, funcionesResult, resenasResult] = await Promise.all([
      this.peliculasService.getPorId(this.peliculaId),
      this.peliculasService.getFuncionesDePelicula(this.peliculaId),
      this.peliculasService.getResenas(this.peliculaId)
    ]);

    if (peliculaResult.data) this.pelicula.set(peliculaResult.data);
    if (funcionesResult.data) this.funciones.set(funcionesResult.data);
    if (resenasResult.data) this.resenas.set(resenasResult.data);

    this.cargando.set(false);
  }

  async enviarResena() {
    const usuario = this.auth.currentUser();
    if (!usuario) return; // el botón no debería mostrarse sin login, pero por las dudas

    this.errorResena.set('');
    this.enviandoResena.set(true);

    const { error } = await this.peliculasService.crearResena(
      this.peliculaId, usuario.id, this.nuevaEstrellas, this.nuevoComentario
    );

    this.enviandoResena.set(false);

    if (error) {
      this.errorResena.set(error.message);
      return;
    }

    this.nuevoComentario = '';
    this.nuevaEstrellas = 5;
    await this.cargarTodo(); // refresca reseñas + puntuación promedio
  }
}