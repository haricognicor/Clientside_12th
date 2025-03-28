/// <reference types="@angular/localize" />

import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { provideRouter } from '@angular/router'; // Add this for routing
import { routes } from './app/app.routes'; // Import your routes

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    provideAnimations(),
    provideRouter(routes), // Provide the routes from app.routes.ts
    ...(appConfig.providers || [])
  ]
}).catch(err => console.error(err));