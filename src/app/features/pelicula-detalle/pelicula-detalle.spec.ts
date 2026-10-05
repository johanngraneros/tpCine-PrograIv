import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PeliculaDetalle } from './pelicula-detalle';
import { provideRouter } from '@angular/router';

describe('PeliculaDetalle', () => {
  let component: PeliculaDetalle;
  let fixture: ComponentFixture<PeliculaDetalle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PeliculaDetalle],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(PeliculaDetalle);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
