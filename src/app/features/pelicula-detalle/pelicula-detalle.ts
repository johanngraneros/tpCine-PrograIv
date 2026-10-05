import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { PeliculasService } from '../../core/services/peliculas.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-pelicula-detalle',
  imports: [DatePipe, ReactiveFormsModule, RouterLink],
  templateUrl: './pelicula-detalle.html',
  styleUrl: './pelicula-detalle.css'
})
export class PeliculaDetalle implements OnInit {
  private route = inject(ActivatedRoute);
  private peliculasService = inject(PeliculasService);
  private formBuilder = inject(FormBuilder);
  auth = inject(AuthService); // público, lo usamos desde el template

  peliculaId = '';
  pelicula = signal<any>(null);
  funciones = signal<any[]>([]);
  resenas = signal<any[]>([]);
  cargando = signal(true);

  resenaForm = this.formBuilder.nonNullable.group({
    estrellas: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    comentario: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]]
  });
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

  if (!usuario) {
    this.errorResena.set(
      'Tenés que iniciar sesión para publicar una reseña.'
    );
    return;
  }

  const { estrellas, comentario: comentarioIngresado } =
    this.resenaForm.getRawValue();
  const comentario = comentarioIngresado.trim();

  if (comentario.length === 0) {
    this.errorResena.set(
      'Escribí un comentario antes de publicar la reseña.'
    );
    return;
  }

  if (comentario.length < 5) {
    this.errorResena.set(
      'El comentario debe tener al menos 5 caracteres.'
    );
    return;
  }

  if (
    estrellas < 1 ||
    estrellas > 5
  ) {
    this.errorResena.set(
      'Seleccioná una puntuación entre 1 y 5 estrellas.'
    );
    return;
  }

  if (this.enviandoResena()) {
    return;
  }

  this.errorResena.set('');
  this.enviandoResena.set(true);

  const { error } =
    await this.peliculasService.crearResena(
      this.peliculaId,
      usuario.id,
      estrellas,
      comentario
    );

  this.enviandoResena.set(false);

  if (error) {
    if (error.code === '23505') {
      this.errorResena.set(
        'Ya publicaste una reseña para esta película.'
      );
      return;
    }

    this.errorResena.set(
      'No se pudo publicar la reseña. Intentá nuevamente.'
    );
    return;
  }

  this.resenaForm.reset({
    estrellas: 5,
    comentario: ''
  });

  await this.cargarTodo();
  }
}
