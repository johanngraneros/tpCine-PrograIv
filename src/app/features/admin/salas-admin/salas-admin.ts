import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AdminSalasService,
  ButacaSalaAdmin,
  SalaAdmin
} from '../../../core/services/admin-salas.service';
import { traducirError } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-salas-admin',
  imports: [ReactiveFormsModule],
  templateUrl: './salas-admin.html',
  styleUrl: './salas-admin.css'
})
export class SalasAdmin implements OnInit {
  private servicio = inject(AdminSalasService);
  private formBuilder = inject(FormBuilder);
  salas = signal<SalaAdmin[]>([]);
  salaSeleccionada = signal<SalaAdmin | null>(null);
  cargando = signal(true);
  guardando = signal<string | null>(null);
  mensaje = signal('');
  creando = signal(false);
  salaForm = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(60)]]
  });

  async ngOnInit() {
    await this.cargarSalas();
  }

  async cargarSalas() {
    this.cargando.set(true);
    const { data, error } = await this.servicio.obtenerSalas();
    if (error) {
      this.mensaje.set('No se pudieron cargar las salas.');
    } else {
      const salas = (data ?? []) as unknown as SalaAdmin[];
      for (const sala of salas) {
        sala.butacas.sort((a, b) => a.fila.localeCompare(b.fila) || a.numero - b.numero);
      }
      this.salas.set(salas);
      this.salaSeleccionada.set(salas[0] ?? null);
    }
    this.cargando.set(false);
  }

  seleccionarSala(id: string) {
    this.salaSeleccionada.set(this.salas().find(sala => sala.id === id) ?? null);
    this.mensaje.set('');
  }

  async crearSala() {
    if (this.salaForm.invalid || this.creando()) {
      this.salaForm.markAllAsTouched();
      return;
    }
    this.creando.set(true);
    this.mensaje.set('');
    const { error } = await this.servicio.crearSala(this.salaForm.controls.nombre.value.trim());
    if (error) {
      this.mensaje.set(traducirError(error, 'No se pudo crear la sala. Intentá nuevamente.'));
    } else {
      this.salaForm.reset();
      await this.cargarSalas();
      this.mensaje.set('Sala creada con su distribución reglamentaria.');
    }
    this.creando.set(false);
  }

  filas(sala: SalaAdmin) {
    return [...new Set(sala.butacas.map(butaca => butaca.fila))].map(fila => ({
      fila,
      butacas: sala.butacas.filter(butaca => butaca.fila === fila)
    }));
  }

  async alternarTipo(butaca: ButacaSalaAdmin) {
    if (this.guardando()) return;
    const tipos: ButacaSalaAdmin['tipo'][] = ['normal', 'vip', 'accesible'];
    const tipo = tipos[(tipos.indexOf(butaca.tipo) + 1) % tipos.length];
    this.guardando.set(butaca.id);
    this.mensaje.set('');
    const { error } = await this.servicio.cambiarTipoButaca(butaca.id, tipo);
    if (error) {
      this.mensaje.set(traducirError(error, 'No se pudo cambiar el tipo de butaca. Intentá nuevamente.'));
    } else {
      butaca.tipo = tipo;
      this.salas.update(salas => [...salas]);
      this.mensaje.set(`Butaca ${butaca.fila}${butaca.numero}: ${tipo}.`);
    }
    this.guardando.set(null);
  }
}
