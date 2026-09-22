import {Directive, effect, inject, Input, signal, TemplateRef, ViewContainerRef} from '@angular/core';

import { AuthService } from '../../core/services/auth.service';

@Directive({
  selector: '[appRoleDirective]'
})
export class RoleDirective {
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly authService = inject(AuthService);

  private readonly rolRequerido = signal('');

  @Input()
  set appRole(rol: string) {
    this.rolRequerido.set(rol);
  }

  constructor() {
    effect(() => {
      const usuario = this.authService.currentUser();
      const rolUsuario = usuario?.user_metadata?.['rol'];
      const rolRequerido = this.rolRequerido();

      this.viewContainer.clear();

      if (rolUsuario === rolRequerido) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    });
  }
}










