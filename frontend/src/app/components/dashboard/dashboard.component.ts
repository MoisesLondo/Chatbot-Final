import { ChangeDetectionStrategy, Component, OnInit, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

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
  avgTicket?: number;
  totalClients?: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, AfterViewInit {

  userName: string = '';
  userRole: string = '';
  selectedPeriod: string = 'month'; // default para admin

  leads: Lead[] = [];
  stats: Stats = {
    totalLeads: 0,
    totalQuotes: 0,
    most_active_seller: '',
    most_quoted_product: '',
    avgTicket: 0,
    totalClients: 0
  };

  private charts: Chart[] = [];

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

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initCharts();
    }, 300);
  }

  loadStats(): void {
    this.http.get<any>('http://localhost:8000/stats').subscribe({
      next: (data) => {
        this.stats.totalLeads = data.totalLeads;
        this.stats.totalQuotes = data.totalQuotes;
        this.stats.most_active_seller = data.mostActiveSeller;
        this.stats.most_quoted_product = data.mostQuotedProduct;
        this.stats.avgTicket = data.avgTicket || 0;
        this.stats.totalClients = data.totalClients || 0;
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

  // Inicializa todos los gráficos del dashboard
  initCharts(): void {
    this.destroyCharts();

    if (this.userRole === 'admin') {
      this.createChart('quotesBySellerChart', 'bar', {
        labels: ['Juan', 'Ana', 'Pedro'],
        datasets: [{
          label: 'Cotizaciones',
          data: [12, 19, 8]
        }],
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });

      this.createChart('topProductsChart', 'pie', {
        labels: ['Varilla', 'Cemento', 'Lámina'],
        datasets: [{
          data: [30, 50, 20]
        }],
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });

      this.createChart('quotesOverTimeChart', 'line', {
        labels: ['Ene', 'Feb', 'Mar', 'Abr'],
        datasets: [{
          label: 'Cotizaciones',
          data: [10, 15, 20, 18]
        }],
        options: {
          responsive: true,
          maintainAspectRatio: false  
        }
      });

      this.createChart('channelComparisonChart', 'doughnut', {
        labels: ['Chatbot', 'Vendedores'],
        datasets: [{
          data: [45, 55]
        }],
        options: {
          responsive: true,
          maintainAspectRatio: false  
        }
      });

    } else if (this.userRole === 'vendedor') {
      this.createChart('sellerQuotesOverTimeChart', 'line', {
        labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
        datasets: [{
          label: 'Tus Cotizaciones',
          data: [3, 6, 4, 8]
        }]
      });

      this.createChart('sellerTopProductsChart', 'bar', {
        labels: ['Varilla', 'Tubo', 'Perfil'],
        datasets: [{
          label: 'Productos Cotizados',
          data: [5, 2, 7]
        }]
      });
    }
  }

  private createChart(elementId: string, type: any, data: any): void {
    const ctx = document.getElementById(elementId) as HTMLCanvasElement;
    if (!ctx) return;
    const chart = new Chart(ctx, {
      type,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
    this.charts.push(chart);
  }

  private destroyCharts(): void {
    this.charts.forEach(chart => chart.destroy());
    this.charts = [];
  }

  viewLead(leadId: number): void {
    this.router.navigate(['/leads', leadId]);
  }

  editLead(leadId: number): void {
    this.router.navigate(['/leads', leadId, 'edit']);
  }

  logout(): void {
    this.router.navigate(['/login']);
  }
}