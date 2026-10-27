import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { initNativeShell } from './core/native/native-shell';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { tokenInterceptor } from './core/auth/token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([tokenInterceptor])),
    // Android / iOS only: back button and status bar (no-op on web and desktop).
    { provide: APP_INITIALIZER, useFactory: initNativeShell, multi: true },
  ],
};
