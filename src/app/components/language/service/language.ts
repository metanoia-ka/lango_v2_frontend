import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { StorageService } from '../../storage/storage-main';

@Injectable({ providedIn: 'root' })
export class Language {
  private currentLang = new BehaviorSubject<string>('fr');
  lang$ = this.currentLang.asObservable();

  private storage = inject(StorageService)

  setLanguage(lang: string) {
    this.currentLang.next(lang);
    this.storage.set('app_lang', lang);
  }

  getLanguage(): string {
    return this.currentLang.value;
  }

  loadLanguage() {
    const saved = this.storage.get('app_lang');
    if (saved) this.currentLang.next(saved);
  }
}
