import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  // Datos dummy del usuario (normalmente vendrían de un servicio de auth)
  protected userName = 'Carlos Mendoza';
  protected userRole = 'admin'; // Cambiar a 'vendedor' para probar la vista de vendedor

  constructor(private router: Router) {}

  logout(): void {
    // Lógica de logout
    console.log('Cerrando sesión...');
    
    // Limpiar datos de sesión
    localStorage.removeItem('auth_token');
    sessionStorage.clear();
    
    // Redirigir al login
    this.router.navigate(['/login']);
  }
}