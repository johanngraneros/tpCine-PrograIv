import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Cartelera } from './cartelera';
import { provideRouter } from '@angular/router';

describe('Cartelera', () => {
  let component: Cartelera;
  let fixture: ComponentFixture<Cartelera>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Cartelera],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(Cartelera);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
