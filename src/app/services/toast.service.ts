import { Injectable } from "@angular/core";

export interface Toast {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'notification';
  duration?: number;
  icon?: string;          // bonus
  data?: any
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts: Toast[] = [];

  show(toast: Toast) {
    this.toasts.push(toast);
    setTimeout(() => this.remove(toast), toast.duration ?? 7000);
  }

  showNotification(message: string, duration = 9000, data?: any) {
    this.show({
      message,
      type: 'notification',
      duration,
      icon: 'bi-bell-fill',
      data
    });
  }

  showSuccess(message: string, duration = 8000) {
    this.show({ message, type: 'success', duration, icon: 'bi-check-circle' });
  }

  showError(message: string, duration = 8000) {
    this.show({ message, type: 'error', duration, icon: 'bi-exclamation-triangle' });
  }

  showInfo(message: string, duration = 7000) {
    this.show({ message, type: 'info', duration, icon: 'bi-info-circle' });
  }

  showWarning(message: string, duration = 5000) {
    this.show({ message, type: 'warning', duration, icon: 'bi-exclamation-circle' });
  }

  private remove(toast: Toast) {
    this.toasts = this.toasts.filter(t => t !== toast);
  }
  
  get activeToasts() {
      return this.toasts;
  }
}