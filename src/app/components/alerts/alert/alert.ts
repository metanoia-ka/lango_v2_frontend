import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type AlertType = 'success' | 'danger' | 'warning' | 'info' | 'error';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert.html',
  styleUrl: './alert.scss',
  animations: [
    trigger('fade', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(-20px)' }))
      ])
    ])
  ]
})
export class Alert {
  @Input() type: AlertType = 'info';
  @Input() title: string = '';
  @Input() dismissible: boolean = true;
  @Input() autoClose: boolean = false;
  @Input() autoCloseDelay: number = 5000;
  @Output() onClose = new EventEmitter<void>();

  ngOnInit() {
    if (this.autoClose) {
      setTimeout(() => {
        this.close();
      }, this.autoCloseDelay);
    }
  }

  close() {
    this.onClose.emit();
  }

  getIcon(): string {
    const icons = {
      'success': 'bi bi-check-circle-fill text-success',
      'danger': 'bi bi-exclamation-triangle-fill text-danger',
      'warning': 'bi bi-exclamation-circle-fill text-warning',
      'info': 'bi bi-info-circle-fill text-info',
      'error': 'bi bi-x-circle text-danger'
    };
    return icons[this.type];
  }

  getAlertClasses(): string {
    const baseClasses = 'alert alert-dismissible fade show mb-3';
    return `${baseClasses} alert-${this.type}`;
  }
}
