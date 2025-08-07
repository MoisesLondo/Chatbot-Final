import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule, RouterLink } from '@angular/router';
import { OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: 'Nuevo' | 'En espera' | 'Convertido' | 'Perdido';
  date: Date;
}

interface Stats {
  totalLeads: number;
  totalQuotes: number;
  monthlySales: number;
  conversionRate: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterModule, RouterLink, CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit{
  userName: string = 'Carlos Mendoza'; // Esto vendría del servicio de autenticación
  userRole: 'admin' | 'vendedor' = 'admin'; // Esto vendría del servicio de autenticación

  stats: Stats = {
    totalLeads: 156,
    totalQuotes: 89,
    monthlySales: 450000,
    conversionRate: 23.5
  };

  leads: Lead[] = [
    {
      id: 3,
      name: 'Roberto Silva',
      email: 'roberto@obras.com',
      phone: '+58 412 555-1234',
      status: 'Convertido',
      date: new Date('2025-08-13')
    },
    {
      id: 4,
      name: 'María López',
      email: 'maria@proyectos.com',
      phone: '+58 412 777-8888',
      status: 'En espera',
      date: new Date('2025-08-12')
    },
    {
      id: 5,
      name: 'Diego Ramírez',
      email: 'diego@industrial.com',
      phone: '+58 412 333-4444',
      status: 'Perdido',
      date: new Date('2025-08-11')
    }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Aquí cargarías los datos del usuario y estadísticas desde tus servicios
    this.loadUserData();
    this.loadStats();
    this.loadLeads();
  }

  loadUserData(): void {
    // Simular carga de datos del usuario
    // En una aplicación real, esto vendría de un servicio de autenticación
    console.log('Cargando datos del usuario...');
  }

  loadStats(): void {
    // Simular carga de estadísticas
    // En una aplicación real, esto vendría de un servicio de estadísticas
    console.log('Cargando estadísticas...');
  }

  loadLeads(): void {
    // Simular carga de leads
    // En una aplicación real, esto vendría de un servicio de leads
    console.log('Cargando leads...');
  }

  viewLead(leadId: number): void {
    console.log('Ver lead:', leadId);
    // Implementar navegación a vista de detalle del lead
    this.router.navigate(['/leads', leadId]);
  }

  editLead(leadId: number): void {
    console.log('Editar lead:', leadId);
    // Implementar navegación a formulario de edición del lead
    this.router.navigate(['/leads', leadId, 'edit']);
  }

  logout(): void {
    console.log('Cerrando sesión...');
    // Implementar lógica de logout
    // Limpiar tokens, redirigir al login, etc.
    this.router.navigate(['/login']);
  }
}
