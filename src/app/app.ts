import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Supabase } from './core/supabase';
import { Header } from './shared/components/header/header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected title = 'cine';
  private supabase = inject(Supabase);

  async ngOnInit() {
    const { data, error } = await this.supabase.instance.auth.getSession();
    console.log('Conexión Supabase:', error ? 'ERROR' : 'OK', data);
  }
}