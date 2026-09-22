import { Component, model } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-search-bar',
  styleUrl: './search-bar.css',
  templateUrl: './search-bar.html',
})
export class SearchBar {
  termino = model<string>('');

  limpiar(): void {
    this.termino.set('');
  }
}
