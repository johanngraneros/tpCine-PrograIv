import { Component, effect, inject, signal, OnInit } from '@angular/core';
import { PeliculasService } from '../../core/services/peliculas.service';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AlertasEstrenosService } from '../../core/services/alertas-estrenos.service';

interface ProximoEstreno {
  id: string;
  titulo: string;
  sinopsis: string | null;
  imagen_url: string | null;
  fecha_estreno: string;
}

@Component({
  imports: [RouterLink],
  selector: 'app-home',
  styleUrl: './home.css',
  templateUrl: './home.html',
})
export class Home implements OnInit {
  private peliculasService = inject(PeliculasService);
  private alertasService = inject(AlertasEstrenosService);
  private authService = inject(AuthService);
  private router = inject(Router);

  peliculasDestacadas = signal<any[]>([]);
  proximosEstrenos = signal<ProximoEstreno[]>([]);
  cargando = signal(true);
  alertasActivas = signal<Set<string>>(new Set());
  mensajeAlerta = signal('');
  errorEstrenos = signal('');
  formatosPorPelicula = signal<Record<string, string[]>>({});

  constructor() {
    effect(() => {
      const usuario = this.authService.currentUser();

      if (usuario) {
        void this.cargarAlertas();
      } else {
        this.alertasActivas.set(new Set());
      }
    });
  }

  async ngOnInit() {
    const [destacadas, proximas] = await Promise.all([
      this.peliculasService.getTop3Vendidas(),
      this.peliculasService.getProximosEstrenos()
    ]);

    if (!destacadas.error && destacadas.data) {
      this.peliculasDestacadas.set(destacadas.data);
      const formatos = await this.peliculasService.getFormatosDisponibles(
        destacadas.data.map(pelicula => pelicula.id)
      );
      if (!formatos.error) {
        const agrupados: Record<string, Set<string>> = {};
        for (const funcion of formatos.data ?? []) {
          agrupados[funcion.pelicula_id] ??= new Set<string>();
          agrupados[funcion.pelicula_id].add(`${funcion.formato} · ${funcion.idioma}`);
        }
        this.formatosPorPelicula.set(
          Object.fromEntries(
            Object.entries(agrupados).map(([id, valores]) => [id, [...valores]])
          )
        );
      }
    }

    if (!proximas.error && proximas.data) {
      this.proximosEstrenos.set(
        proximas.data as unknown as ProximoEstreno[]
      );
    } else if (proximas.error) {
      this.errorEstrenos.set('No se pudieron consultar los próximos estrenos.');
    }

    this.cargando.set(false);
  }

  formatosDe(peliculaId: string) {
    return this.formatosPorPelicula()[peliculaId] ?? [];
  }

  private async cargarAlertas() {
    const usuario = this.authService.currentUser();
    if (!usuario) return;

    const { data } = await this.alertasService.obtenerSuscripciones(usuario.id);
    this.alertasActivas.set(
      new Set((data ?? []).map(item => item.pelicula_id))
    );
  }

  async alternarAlerta(peliculaId: string) {
    const usuario = this.authService.currentUser();
    if (!usuario) {
      await this.router.navigate(['/login']);
      return;
    }

    const activas = new Set(this.alertasActivas());
    const estaActiva = activas.has(peliculaId);
    const { error } = estaActiva
      ? await this.alertasService.cancelar(usuario.id, peliculaId)
      : await this.alertasService.suscribirse(usuario.id, peliculaId);

    if (error) {
      this.mensajeAlerta.set('No se pudo actualizar la alerta.');
      return;
    }

    if (estaActiva) {
      activas.delete(peliculaId);
      this.mensajeAlerta.set('Alerta desactivada.');
    } else {
      activas.add(peliculaId);
      this.mensajeAlerta.set('Te avisaremos cuando haya entradas disponibles.');
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      await this.alertasService.mostrarNotificacionesPendientes(usuario.id);
    }

    this.alertasActivas.set(activas);
  }

  formatearFechaEstreno(fecha: string) {
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).format(new Date(fecha));
  }
}
