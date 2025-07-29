
import { Routes } from '@angular/router';

import { LandingComponent } from './landing/landing.component';
import { ChatComponent } from './chat/chat.component';
import { LoginComponent } from './login/login.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'chat', component: ChatComponent },
  { path: 'login', component: LoginComponent },
  { path: '**', redirectTo: '' }
];
