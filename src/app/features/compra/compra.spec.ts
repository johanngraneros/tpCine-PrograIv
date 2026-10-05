import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Compra } from './compra';
import { provideRouter } from '@angular/router';

describe('Compra', () => {
  let component: Compra;
  let fixture: ComponentFixture<Compra>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Compra],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(Compra);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
