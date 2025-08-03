import { Routes } from '@angular/router';

import { LandingComponent } from './landing/landing.component';
import { ChatComponent } from './chat/chat.component';

import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { authGuard } from './guards/auth.guard';
import { QuoteComponent } from '../quote/quote.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'chat', component: ChatComponent },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'quote', component: QuoteComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
