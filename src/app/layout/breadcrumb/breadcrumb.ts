import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-breadcrumb',
  imports: [CommonModule, RouterModule],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.scss'
})
export class Breadcrumb {

  router = inject(Router);
  route = inject(ActivatedRoute);

  breadcrumbs = signal<{ label: string, url: string }[]>([]);

  constructor() {
    this.router.events.subscribe(() => {
      this.buildBreadcrumbs();
    });
  }

  private buildBreadcrumbs() {
    let current = this.route.root;
    let url = '';
    const crumbs = [];

    while (current.firstChild) {
      current = current.firstChild;
      if (current.snapshot.url.length) {
        url += '/' + current.snapshot.url.map(s => s.path).join('/');
        const label = current.snapshot.data['breadcrumb'];
        if (label) crumbs.push({ label, url });
      }
    }

    this.breadcrumbs.set(crumbs);
  }
}
