import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule, RouterLink } from '@angular/router';
import { OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  date: Date;
}

interface Stats {
  totalLeads: number;
  totalQuotes: number;
  most_active_seller: string;
  most_quoted_product: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit{
  
  userName: string = '';
  userRole: string = '';

  leads: Lead[] = [];
  stats: Stats = {
    totalLeads: 0,
    totalQuotes: 0,
    most_active_seller: '',
    most_quoted_product: ''
  };

  constructor(
    private router: Router,
    private authService: AuthService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUserData();
    if (user) {
      this.userName = user.sub;   
      this.userRole = user.role;  
    } else {
      this.router.navigate(['/login']);
    
    }

    this.loadStats();
    this.loadLeads();

  }

  loadStats(): void {
    this.http.get<any>('http://localhost:8000/stats').subscribe({
      next: (data) => {
        this.stats.totalLeads = data.totalLeads;
        this.stats.totalQuotes = data.totalQuotes;
        this.stats.most_active_seller = data.mostActiveSeller;
        this.stats.most_quoted_product = data.mostQuotedProduct;
        this.cdr.markForCheck();
        console.log('Estadísticas cargadas:', this.stats);
      },
      error: (err) => {
        console.error('Error cargando estadísticas', err);
      }
    });
  }

  loadLeads(): void {
    this.http.get<any[]>('http://localhost:8000/leads').subscribe({
      next: (data) => {
        this.leads = data.map(lead => ({
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          date: new Date(lead.date)
        }));
        console.log('Leads cargados:', this.leads);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error cargando leads', err);
      }
    });
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
