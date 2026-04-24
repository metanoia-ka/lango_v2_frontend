import { Component, inject, OnInit } from '@angular/core';
import { AlertMessage } from '../model/alert-message.model';
import { CommonModule } from '@angular/common';
import { SAlertGlobal } from '../service/alert-global';
import { animate, style, transition, trigger } from '@angular/animations';
import { Subscription } from 'rxjs';

export type AlertType = 'success' | 'danger' | 'warning' | 'info';

@Component({
  selector: 'app-alert-global',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alert-global.html',
  styleUrl: './alert-global.scss',
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
export class AlertGlobal implements OnInit {

  typeAlertType: AlertType = 'info';
  alerts: AlertMessage[] = [];
  private sub = new Subscription();
  
  private alertService = inject(SAlertGlobal);

  ngOnInit(): void {
    this.sub.add(
      this.alertService.alert$.subscribe(alerts => {
        this.alerts = alerts;
      })
    );
  }

  getIcon(): string {
    const icons = {
      'success': 'bi bi-check-circle-fill text-success',
      'danger': 'bi bi-exclamation-triangle-fill text-danger',
      'warning': 'bi bi-exclamation-circle-fill text-warning',
      'info': 'bi bi-info-circle-fill text-info'
    };
    return icons[this.typeAlertType];
  }

  getAlertClasses(): string {
    const baseClasses = 'alert alert-dismissible fade show mb-3';
    return `${baseClasses} alert-${this.typeAlertType}`;
  }

  close(id?: string): void {
    this.alertService.removeAlert(id!);
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
