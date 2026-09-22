import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Butacas } from './butacas';

describe('Butacas', () => {
  let component: Butacas;
  let fixture: ComponentFixture<Butacas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Butacas],
    }).compileComponents();

    fixture = TestBed.createComponent(Butacas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
