import {
  Directive,
  Input,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject
} from '@angular/core';
import { Authentication } from '../auth/core/authentication';

@Directive({
  selector: '[hasRole]',
  standalone: true
})
export class HasRoleDirective {

  private auth = inject(Authentication);
  private tpl = inject(TemplateRef);
  private vcr = inject(ViewContainerRef);

  @Input('hasRole') roles: string[] | string = [];

  constructor() {
    effect(() => {
      this.vcr.clear();

      const required = Array.isArray(this.roles)
        ? this.roles
        : [this.roles];

      if (this.auth.hasAnyRole(required)) {
        this.vcr.createEmbeddedView(this.tpl);
      }
    });
  }
}
