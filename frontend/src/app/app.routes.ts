import { Routes, RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { LandingComponent } from './components/landing/landing.component';
import { ChatComponent } from './components/chat/chat.component';
import { MainLayoutComponent } from './components/main-layout/main.layout.component';
import { LoginComponent } from './components/login/login.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { authGuard } from './guards/auth.guard';
import { QuoteComponent } from './components/quote/quote.component';
import { UsersComponent } from './components/users/users.component';
import { usersResolver } from './components/users/users.resolver';
import { AdminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'chat', component: ChatComponent },
  { path: 'login', component: LoginComponent },

  // Rutas protegidas (con layout)
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'quote', component: QuoteComponent },
      
      // Rutas solo para admin
      { 
        path: 'users', component: UsersComponent,
        canActivate: [AdminGuard],
        resolve: {
          users: usersResolver
        }
      },

    ],
  },
  { path: '**', redirectTo: '' }
  
];
