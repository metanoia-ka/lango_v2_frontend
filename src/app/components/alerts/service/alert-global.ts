import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AlertMessage } from '../model/alert-message.model';

@Injectable({
  providedIn: 'root'
})
export class SAlertGlobal {

  private alertSubject = new BehaviorSubject<AlertMessage[] >([]);
  alert$ = this.alertSubject.asObservable();

  showAlert(alert: AlertMessage) {
    const id = crypto.randomUUID();
    const alertWithId = { ...alert, id };

    const current = this.alertSubject.getValue();
    this.alertSubject.next([...current, alertWithId]);

    if (alert.duration && alert.duration > 0) {
      setTimeout(() => {
        
      }, alert.duration);
    }
  }

  removeAlert(id: string): void {
    const updated = this.alertSubject.getValue().filter(a => a.id !== id);
    this.alertSubject.next(updated);
  }

  clear() {
    this.alertSubject.next([]);
  }
}
