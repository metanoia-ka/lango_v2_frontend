import { isPlatformBrowser } from "@angular/common";
import { Inject, Injectable, PLATFORM_ID } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class StorageService {

  constructor(@Inject(PLATFORM_ID) private plateformId: any) {}

  getItem(key: string): string | null {
    if (isPlatformBrowser(this.plateformId)) {
      return localStorage.getItem(key);
    }
    return null;
  }

  setItem(key: string, value: string): void {
    if (isPlatformBrowser(this.plateformId)) {
      localStorage.setItem(key, value);
    }
  }

  removeItem(key: string): void {
    if (isPlatformBrowser(this.plateformId)) {
      localStorage.removeItem(key);
    }
  }

  clear(): void {
    if (isPlatformBrowser(this.plateformId)) {
      localStorage.clear();
    }
  }
}