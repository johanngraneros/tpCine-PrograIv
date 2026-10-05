import { Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './shared/components/header/header';
import { AuthService } from './core/services/auth.service';
import { AlertasEstrenosService } from './core/services/alertas-estrenos.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected title = 'cine';
  private auth = inject(AuthService);
  private alertas = inject(AlertasEstrenosService);
  private usuarioNotificado = signal<string | null>(null);

  constructor() {
    effect(() => {
      const usuario = this.auth.currentUser();
      if (!usuario || this.usuarioNotificado() === usuario.id) return;
      this.usuarioNotificado.set(usuario.id);
      void this.alertas.mostrarNotificacionesPendientes(usuario.id);
    });
  }
}
