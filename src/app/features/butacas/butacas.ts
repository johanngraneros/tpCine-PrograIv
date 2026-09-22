import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButacasService } from '../../core/services/butacas.service';
import type { RealtimeChannel } from '@supabase/supabase-js';

@Component({
  imports: [RouterLink],
  selector: 'app-butacas',
  styleUrl: './butacas.css',
  templateUrl: './butacas.html',
})
export class Butacas implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private butacasService = inject(ButacasService);
  private canal: RealtimeChannel | null = null;

  funcionId = '';
  datosFuncion = signal<any>(null);
  filasAgrupadas = signal<any[]>([]);
  cargando = signal(true);

  butacasOcupadas = signal<Set<string>>(new Set());

  butacasElegidas = signal<Set<string>>(new Set());

  async ngOnInit() {
    this.funcionId = this.route.snapshot.paramMap.get('funcionId')!;
    await this.cargarTodo();
    this.canal = this.butacasService.suscribirCambios(this.funcionId, () => {
    this.recargarOcupadas();
    });
  }

  private async cargarTodo() {
      this.cargando.set(true);

      const { data: funcionData } = await this.butacasService.getFuncion(this.funcionId);
      if (funcionData) {
        this.datosFuncion.set(funcionData);

        const { data: butacasData } = await this.butacasService.getButacasDeSalas(funcionData.salas.id);

        const mapaButacas = new Map<string, any[]>();

        if (butacasData) {
          butacasData.forEach(butaca => {
            if(!mapaButacas.has(butaca.fila)){
              mapaButacas.set(butaca.fila, [])
            }
            mapaButacas.get(butaca.fila)!.push(butaca);  
          }
        );
        

          this.filasAgrupadas.set(Array.from(mapaButacas.entries()).map(([fila, butacas]) => ({ fila, butacas })) )      
        } 
        
        await this.recargarOcupadas();
      } 
      this.cargando.set(false);
    }

    private async recargarOcupadas() {
      const { data: ocupadasData } = await this.butacasService.getButacasOcupadas(this.funcionId);
      this.butacasOcupadas.set(new Set((ocupadasData ?? []).map(e => e.butaca_id)));
    }
    
    toggleButaca(butaca: any) {
    if (this.butacasOcupadas().has(butaca.id)) return;

      const seleccion = new Set(this.butacasElegidas());
      if (seleccion.has(butaca.id)) {
        seleccion.delete(butaca.id);
      } else {
        seleccion.add(butaca.id);
      }
      this.butacasElegidas.set(seleccion);
    }

  ngOnDestroy() {
    if (this.canal) {
      this.butacasService.cerrarCanal(this.canal);
    }
  }
  
}
