import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { traducirError } from '../../../core/services/supabase.service';
import { convertirFechaAISO, enmascararFecha } from '../../../core/utils/fecha.utils';

function fechaNacimientoValida(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const fechaIso = convertirFechaAISO(control.value);
  if (!fechaIso) return { fechaNacimientoInvalida: true };
  const fecha = new Date(`${fechaIso}T00:00:00`);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (Number.isNaN(fecha.getTime()) || fecha > hoy || fecha.getFullYear() < 1900) {
    return { fechaNacimientoInvalida: true };
  }
  return null;
}

function contrasenasCoinciden(formulario: AbstractControl): ValidationErrors | null {
  const password = formulario.get('password')?.value;
  const confirmarPassword = formulario.get('confirmarPassword')?.value;
  return password === confirmarPassword ? null : { contrasenasNoCoinciden: true };
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  readonly fechaMaxima = new Date().toISOString().slice(0, 10);
  //readonly protegemos la referencia a un objeto. Ayuda a evitar reemplazos accidentales.
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly registerForm = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [Validators.required, Validators.minLength(6)]
    ],
    confirmarPassword: ['', Validators.required],
    fechaNacimiento: ['', [Validators.required, fechaNacimientoValida]],
    tipoSangre: ['', Validators.required],
    colorOjos: ['', Validators.required],
    diasVacaciones: [
      0,
      [Validators.required, Validators.min(0)]
    ]
  }, {
    validators: contrasenasCoinciden
  });

  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  aplicarMascaraFechaNacimiento(): void {
    const control = this.registerForm.controls.fechaNacimiento;
    control.setValue(enmascararFecha(control.value), { emitEvent: false });
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched(); //mostrar los errores cuando el usuario intenta enviar un formulario inválido.
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const datos = this.registerForm.getRawValue();

    try {
      const { data, error } = await this.authService.register(
        datos.email,
        datos.password,
        datos.nombre,
        datos.apellido,
        convertirFechaAISO(datos.fechaNacimiento)!,
        datos.tipoSangre,
        datos.colorOjos,
        datos.diasVacaciones
      );

      if (error) {
        throw error;
      }

      if (data.user?.identities?.length === 0) {
        this.errorMessage.set('Este correo ya está registrado.');
        return;
      }

      this.successMessage.set(
        'Registro exitoso. Verifica tu correo o inicia sesión.'
      );

      this.registerForm.reset();
    } catch (error: unknown) {
      this.errorMessage.set(traducirError(error, 'No se pudo completar el registro. Intentá nuevamente.'));
    } finally {
      this.isLoading.set(false);
    }
  }
}
