import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Butacas } from './butacas';
import { provideRouter } from '@angular/router';

describe('Butacas', () => {
  let component: Butacas;
  let fixture: ComponentFixture<Butacas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Butacas],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(Butacas);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
