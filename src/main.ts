import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';

import localeFr from '@angular/common/locales/fr';
import localeEn from '@angular/common/locales/en';

import { registerLocaleData } from '@angular/common';

registerLocaleData(localeFr, 'fr-FR');
registerLocaleData(localeEn, 'en-US');

import { LOCALE_ID } from '@angular/core';
appConfig.providers.push(
  { provide: LOCALE_ID, useValue: 'fr-FR' }
);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => {
    console.error('Bootstrap error:', err);
  })
  .then(() => {
    console.log('✅ Angular application bootstrapped successfully !');
  });
