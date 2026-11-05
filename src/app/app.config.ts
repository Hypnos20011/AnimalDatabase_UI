import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { adminKeyInterceptor } from './admin/admin-key.interceptor';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import localeFr from '@angular/common/locales/fr';

registerLocaleData(localeDe);
registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),
    provideHttpClient(withInterceptors([adminKeyInterceptor])),
  ],
};
