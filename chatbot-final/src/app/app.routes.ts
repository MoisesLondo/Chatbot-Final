
import { Routes } from '@angular/router';

import { LandingComponent } from './landing/landing.component';
import { ChatComponent } from './chat/chat.component';

import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'chat', component: ChatComponent },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
