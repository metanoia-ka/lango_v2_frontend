import { 
  APP_INITIALIZER, 
  ApplicationConfig, 
  LOCALE_ID, 
  provideZoneChangeDetection 
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';

import { routes } from './app.routes';
import { provideHttpClient, withFetch, 
          withInterceptors, withInterceptorsFromDi, 
          withXsrfConfiguration} from '@angular/common/http';
import { sessionExpiredInterceptor } from './auth/core/session-expire.interceptor';
import { Authentication } from './auth/core/authentication';
import { authInitializer } from './auth/core/auth.initializer';
import { provideToastr } from 'ngx-toastr';
import { registerLocaleData } from '@angular/common';
import { sessionInfoInterceptor } from './auth/core/session-info.interceptor';
import { csrfInterceptor } from './auth/core/csrf.interceptor';

if (typeof window !== 'undefined') {
  import('@angular/common/locales/fr').then(locale => {
    registerLocaleData(locale.default);
  });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(
      withInterceptorsFromDi(), 
      withFetch(), 
      withInterceptors([
        sessionExpiredInterceptor, 
        sessionInfoInterceptor, 
        csrfInterceptor
      ]),
      withXsrfConfiguration({
        cookieName: 'csrftoken',
        headerName: 'X-CSRFToken',
      })
    ),
    Authentication,
    {
      provide: APP_INITIALIZER,
      useFactory: authInitializer,
      deps: [Authentication],
      multi: true
    },
    provideToastr({
      timeOut: 6000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
      closeButton: true,
      progressBar: true,
    }),
    {
      provide: LOCALE_ID,
      useValue: 'en'
    }
  ]

};