import {
  Directive,
  TemplateRef,
  ViewContainerRef,
  inject,
  effect,
  Input
} from '@angular/core';
import { Authentication } from '../auth/core/authentication';

@Directive({
  selector: '[isAuthenticated]',
  standalone: true
})
export class IsAuthenticatedDirective {

  private auth = inject(Authentication);
  private tpl = inject(TemplateRef);
  private vcr = inject(ViewContainerRef);

  /**
   * true  => visible si connecté
   * false => visible si NON connecté
   */
  @Input('isAuthenticated') showWhenAuthenticated = true;

  constructor() {
    effect(() => {
      this.vcr.clear();

      const isLogged = this.auth.isAuthenticated();

      if (
        (isLogged && this.showWhenAuthenticated) ||
        (!isLogged && !this.showWhenAuthenticated)
      ) {
        this.vcr.createEmbeddedView(this.tpl);
      }
    });
  }
}
