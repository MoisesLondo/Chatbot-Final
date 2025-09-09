import { ChangeDetectionStrategy, Component, OnInit, ChangeDetectorRef, AfterViewInit, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../../services/loading.service';

Chart.register(...registerables);

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  date: Date;
}

interface Stats {
  totalLeads?: number; // <--- Añade '?'
  totalQuotes?: number; // <--- Añade '?'
  most_active_seller?: string; // <--- Añade '?'
  most_quoted_product?: string; // <--- Añade '?'
  avgTicket?: number; // <--- Añade '?'
  totalClients?: number; // <--- Añade '?'
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
isLoading = signal(true);
statsLoaded = signal(false);
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
    private cdr: ChangeDetectorRef,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
  const user = this.authService.getUserData();
  if (user) {
    this.userName = user.sub;
    this.userRole = user.role;
  } else {
    this.router.navigate(['/login']);
    return; // Salimos si no hay usuario
  }

  if (this.userRole === 'vendedor') {
    this.isLoading.set(true);
    // Llama a los endpoints del vendedor
    forkJoin({
      stats: this.loadSellerStats(),
      leads: this.loadSellerLeads()
    }).pipe(
      finalize(() => {
        this.isLoading.set(false);
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (responses) => {
  // Adaptar stats
  const statsData = responses.stats;
  this.stats.totalQuotes = statsData.totalQuotes;
  this.stats.totalLeads = statsData.totalLeads;
  this.stats.avgTicket = Math.round(statsData.avgTicket * 100) / 100;
  this.stats.totalClients = statsData.totalClients;
  (this.stats as any).quotesOverTime = statsData.quotesOverTime;
  (this.stats as any).topProducts = statsData.topProducts;

  // Adaptar leads
  this.leads = responses.leads.map(lead => ({
    id: 0,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    date: new Date(lead.date)
  }));

  // ¡Renderiza los charts justo después de asignar los datos!
  this.initCharts();
},
      error: (err) => {
        console.error('Error cargando datos del vendedor', err);
      }
    });
  } else {
    // ... Lógica admin como ya tienes implementada ...
    this.loadDashboardData();
  }
}

  ngAfterViewInit(): void {
this.destroyCharts();

  if (this.userRole === 'vendedor') {
    // Cotizaciones en el tiempo
    const labels = (this.stats as any).quotesOverTime?.map((q: { month: any; }) => q.month) || [];
    const data = (this.stats as any).quotesOverTime?.map((q: { quotes: any; }) => q.quotes) || [];
    this.createChart('sellerQuotesOverTimeChart', 'line', {
      labels,
      datasets: [{
        label: 'Tus Cotizaciones',
        data
      }]
    });

    // Productos más cotizados
    const prodLabels = (this.stats as any).topProducts?.map((p: { name: any; }) => p.name) || [];
    const prodData = (this.stats as any).topProducts?.map((p: { count: any; }) => p.count) || [];
    this.createChart('sellerTopProductsChart', 'bar', {
      labels: prodLabels,
      datasets: [{
        label: 'Productos Cotizados',
        data: prodData
      }]
    });
  }
  // ... lógica admin ...
}

  loadStats() {
  return this.http.get<any>('http://localhost:8000/stats');
}


  loadLeads() {
  return this.http.get<any[]>('http://localhost:8000/leads');
}

  // Inicializa todos los gráficos del dashboard
  initCharts(): void {
    this.destroyCharts();

    if (this.userRole === 'admin') {
      // ...admin charts como antes...
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
      const quotesOverTime = ((this.stats as any).quotesOverTime || []).slice();
      quotesOverTime.sort((a: any, b: any) => a.month.localeCompare(b.month));
      const labelsQuotes = quotesOverTime.map((q: any) => q.month);
      const dataQuotes = quotesOverTime.map((q: any) => q.quotes);
      this.createChart('sellerQuotesOverTimeChart', 'line', {
        labels: labelsQuotes,
        datasets: [{
          label: 'Tus Cotizaciones',
          data: dataQuotes
        }]
      });

      const topProducts = (this.stats as any).topProducts || [];
      const labelsProducts = topProducts.map((p: any) => p.name);
      const dataProducts = topProducts.map((p: any) => p.count);
      this.createChart('sellerTopProductsChart', 'bar', {
        labels: labelsProducts,
        datasets: [{
          label: 'Productos Cotizados',
          data: dataProducts
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

  loadDashboardData(): void {
  this.loadingService.show();
  this.statsLoaded.set(false);

  forkJoin({
    stats: this.loadStats(),
    leads: this.loadLeads() // Este método retorna this.http.get<any[]>('...')
  }).pipe(
    finalize(() => {
      this.loadingService.hide();
      this.cdr.markForCheck();
    })
  ).subscribe({
    next: (responses) => {
      // ... Lógica para las stats ...
      const statsData = responses.stats;
      this.stats.totalLeads = statsData.totalLeads;
      this.stats.totalQuotes = statsData.totalQuotes;
      this.stats.most_active_seller = statsData.mostActiveSeller;
      this.stats.most_quoted_product = statsData.mostQuotedProduct;
      this.stats.avgTicket = statsData.avgTicket || 0;
      this.stats.totalClients = statsData.totalClients || 0;
      this.statsLoaded.set(true);
      this.stats.totalLeads = statsData.totalLeads;
      const leadsFromApi = responses.leads;

      
      this.leads = leadsFromApi.map(apiLead => {
        return {
          id: apiLead.id, 
          name: apiLead.name, 
          email: apiLead.email,
          phone: apiLead.phone,
          date: new Date(apiLead.date) 
        };
      });
      

      console.log('Leads cargados y transformados:', this.leads);
    },
    error: (err) => {
      console.error('Error cargando datos del dashboard', err);
    }
  });
}


  loadSellerStats() {
    const token = this.authService.getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    return this.http.get<any>('http://localhost:8000/seller/dashboard', headers ? { headers } : {});
  }

  loadSellerLeads() {
    const token = this.authService.getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    return this.http.get<any[]>('http://localhost:8000/seller/leads', headers ? { headers } : {});
  }

}

