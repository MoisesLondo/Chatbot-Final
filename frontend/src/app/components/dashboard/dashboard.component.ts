import { ChangeDetectionStrategy, Component, OnInit, ChangeDetectorRef, AfterViewInit, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { LoadingService } from '../../services/loading.service';
import { HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';


@Injectable({ providedIn: 'root' })
export class DashboardResolver implements Resolve<any> {
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  resolve() {
    const user = this.authService.getUserData();
    const role = user?.role || 'vendedor';
    const token = this.authService.getToken();
    const headers = token ? { headers: new HttpHeaders().set('Authorization', `Bearer ${token}`) } : {};

    if (role === 'admin') {
      return forkJoin({
        stats: this.http.get('http://localhost:8000/admin/dashboard', headers),
        leads: this.http.get('http://localhost:8000/admin/leads', headers)
      }).pipe(
        catchError(() => of({ stats: {}, leads: [] }))
      );
    } else {
      return forkJoin({
        stats: this.http.get('http://localhost:8000/seller/dashboard', headers),
        leads: this.http.get('http://localhost:8000/seller/leads', headers)
      }).pipe(
        catchError(() => of({ stats: {}, leads: [] }))
      );
    }
  }
}

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
private adminStatsAllPeriods: any = {};
  private charts: Chart[] = [];

  constructor(
    private router: Router,
    private authService: AuthService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    public loadingService: LoadingService
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
    this.loadingService.show();
    forkJoin({
      stats: this.loadSellerStats(),
      leads: this.loadSellerLeads()
    }).pipe(
      finalize(() => {
        this.isLoading.set(false);
        this.cdr.markForCheck();
        this.loadingService.hide();
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
        this.loadingService.hide();
        console.error('Error cargando datos del vendedor', err);
      }
    });
  } else {
    if (this.userRole === 'admin') {
      this.isLoading.set(true);
      this.loadingService.show();
      // Cargar todos los stats de todos los periodos solo una vez
      this.loadAdminStats('all').toPromise().then(statsResponse => {
        this.adminStatsAllPeriods = statsResponse;
        this.updateAdminDashboardPeriod();
      }).catch(err => {
        this.loadingService.hide();
        console.error('Error cargando dashboard admin', err);
      }).finally(() => {
        this.isLoading.set(false);
        this.cdr.markForCheck();
        this.loadingService.hide();
      });

      // Cargar leads recientes solo una vez
      this.loadAdminLeads().toPromise().then(leadsResponse => {
        this.leads = (leadsResponse || []).map((lead: any) => ({
          id: 0,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          date: new Date(lead.date)
        }));
      }).catch(err => {
        this.loadingService.hide();
        console.error('Error cargando leads admin', err);
      });
    }
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



  // Inicializa todos los gráficos del dashboard
  initCharts(): void {
    this.destroyCharts();

    if (this.userRole === 'admin') {
    // Cotizaciones por vendedor
    const quotesBySeller = (this.stats as any).quotesBySeller || [];
    const sellerLabels = quotesBySeller.map((q: any) => q.seller);
    const sellerData = quotesBySeller.map((q: any) => q.quotes);
    this.createChart('quotesBySellerChart', 'bar', {
      labels: sellerLabels,
      datasets: [{
        label: 'Cotizaciones',
        data: sellerData
      }]
    });

    // Top productos cotizados
    const topProducts = (this.stats as any).topProducts || [];
    const prodLabels = topProducts.map((p: any) => p.name);
    const prodData = topProducts.map((p: any) => p.count);
    this.createChart('topProductsChart', 'pie', {
      labels: prodLabels,
      datasets: [{
        data: prodData
      }]
    });

    // Evolución de cotizaciones
    const quotesOverTime = ((this.stats as any).quotesOverTime || []).slice();
      quotesOverTime.sort((a: any, b: any) => a.month.localeCompare(b.month));
    const timeLabels = quotesOverTime.map((q: any) => q.month);
    const timeData = quotesOverTime.map((q: any) => q.quotes);
    this.createChart('quotesOverTimeChart', 'line', {
      labels: timeLabels,
      datasets: [{
        label: 'Cotizaciones',
        data: timeData
      }]
    });

    // Chatbot vs Vendedores
    const channelComparison = (this.stats as any).channelComparison || [];
    const channelLabels = channelComparison.map((c: any) => c.channel);
    const channelData = channelComparison.map((c: any) => c.count);
    this.createChart('channelComparisonChart', 'doughnut', {
      labels: channelLabels,
      datasets: [{
        data: channelData
      }]
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

  logout(): void {
    this.router.navigate(['/login']);
  }



updateAdminDashboardPeriod(): void {
  const period = this.selectedPeriod || 'month';
  const statsData = this.adminStatsAllPeriods[period] || {};

  this.stats.totalLeads = statsData.totalLeads;
  this.stats.totalQuotes = statsData.totalQuotes;
  this.stats.most_quoted_product = statsData.most_quoted_product;
  this.stats.most_active_seller = statsData.most_active_seller;

  (this.stats as any).quotesBySeller = statsData.quotesBySeller || [];
  (this.stats as any).topProducts = statsData.topProducts || [];
  (this.stats as any).quotesOverTime = statsData.quotesOverTime || [];
  (this.stats as any).channelComparison = statsData.channelComparison || [];

  this.initCharts();
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


  loadAdminStats(period: string) {
  const token = this.authService.getToken();
  const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
  return this.http.get<any>('http://localhost:8000/admin/dashboard', { headers });
}

loadAdminLeads() {
  const token = this.authService.getToken();
  const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
  return this.http.get<any>('http://localhost:8000/admin/leads', { headers });
}

onPeriodChange(): void {
  if (this.userRole === 'admin') {
    this.updateAdminDashboardPeriod();
  }
}
}

