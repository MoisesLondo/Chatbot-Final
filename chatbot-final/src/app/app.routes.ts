import { Routes } from '@angular/router';

import { LandingComponent } from './components/landing/landing.component';
import { ChatComponent } from './components/chat/chat.component';

import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { authGuard } from './guards/auth.guard';
import { QuoteComponent } from './components/quote/quote.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'chat', component: ChatComponent },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'quote', component: QuoteComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
