import { ChangeDetectionStrategy, Component, OnInit, ChangeDetectorRef, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels, { Context } from 'chartjs-plugin-datalabels';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { LoadingService } from '../../services/loading.service';
import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';

Chart.register(...registerables, ChartDataLabels);

@Injectable({ providedIn: 'root' })
export class DashboardResolver implements Resolve<any> {
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  resolve() {
    const user = this.authService.getUserData();
    const role = user?.role || 'Vendedor';
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

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string;
  date: Date;
}

interface Stats {
  totalLeads?: number;
  totalQuotes?: number;
  most_active_seller?: string;
  most_quoted_product?: string;
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
export class DashboardComponent implements OnInit {
  isLoading = signal(true);
  statsLoaded = signal(false);
  userName: string = '';
  userRole: string = '';
  selectedPeriod: string = 'month';

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
      return;
    }

    if (this.userRole === 'Vendedor') {
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
          const statsData = responses.stats;
          this.stats.totalQuotes = statsData.totalQuotes;
          this.stats.totalLeads = statsData.totalLeads;
          this.stats.avgTicket = Math.round(statsData.avgTicket * 100) / 100;
          this.stats.totalClients = statsData.totalClients;
          (this.stats as any).quotesOverTime = statsData.quotesOverTime;
          (this.stats as any).topProducts = statsData.topProducts;
          this.leads = responses.leads.map((lead: any) => ({
            id: 0, name: lead.name, email: lead.email, phone: lead.phone, date: new Date(lead.date)
          }));
          this.initCharts();
        },
        error: (err) => {
          this.loadingService.hide();
          console.error('Error cargando datos del Vendedor', err);
        }
      });
    } else if (this.userRole === 'admin') {
      this.isLoading.set(true);
      this.loadingService.show();
      this.loadAdminStats('all').toPromise().then(statsResponse => {
        this.adminStatsAllPeriods = statsResponse;
        this.updateAdminDashboardPeriod();
      }).catch(err => {
        console.error('Error cargando dashboard admin', err);
      }).finally(() => {
        this.isLoading.set(false);
        this.cdr.markForCheck();
        this.loadingService.hide();
      });

      this.loadAdminLeads().toPromise().then(leadsResponse => {
        this.leads = (leadsResponse || []).map((lead: any) => ({
          id: 0, name: lead.name, email: lead.email, phone: lead.phone, date: new Date(lead.date)
        }));
      }).catch(err => {
        console.error('Error cargando leads admin', err);
      });
    }
  }

  initCharts(): void {
    this.destroyCharts();

    if (this.userRole === 'admin') {
      const quotesBySeller = (this.stats as any).quotesBySeller || [];
      this.createChart('quotesBySellerChart', 'bar', {
        labels: quotesBySeller.map((q: any) => q.seller),
        datasets: [{ label: 'Cotizaciones', data: quotesBySeller.map((q: any) => q.quotes) }]
      });

      const topProducts = (this.stats as any).topProducts || [];
      this.createChart('topProductsChart', 'pie', {
        labels: topProducts.map((p: any) => p.name),
        datasets: [{ data: topProducts.map((p: any) => p.count) }]
      }, 'default');

      const channelComparison = (this.stats as any).channelComparison || [];
      const channelLabels = channelComparison.map((c: any) => c.channel)
        .map((label: string) => label.toLowerCase() === 'vendedor' ? 'Vendedores' : label);
      this.createChart('channelComparisonChart', 'doughnut', {
        labels: channelLabels,
        datasets: [{ data: channelComparison.map((c: any) => c.count) }]
      }, 'default');
      
      const quotesOverTime = (this.stats as any).quotesOverTime || [];
      const quotesOverTimeLabels = quotesOverTime.map((q: any) => {
        if (this.selectedPeriod === 'month') {
          return q.month;
        }
        const date = new Date(q.month);
        if (isNaN(date.getTime())) {
          return q.month;
        }
        return date.toLocaleDateString('es-VE');
      });
      this.createChart('quotesOverTimeChart', 'line', {
          labels: quotesOverTimeLabels,
          datasets: [{ label: 'Cotizaciones', data: quotesOverTime.map((q: any) => q.quotes) }]
      });

    } else if (this.userRole === 'Vendedor') {
      const topProducts = (this.stats as any).topProducts || [];
      this.createChart('sellerTopProductsChart', 'pie', {
        labels: topProducts.map((p: any) => p.name),
        datasets: [{ data: topProducts.map((p: any) => p.count) }]
      }, 'default');

      const quotesOverTime = (this.stats as any).quotesOverTime || [];
      this.createChart('sellerQuotesOverTimeChart', 'line', {
        labels: quotesOverTime.map((q: any) => q.month),
        datasets: [{ label: 'Tus Cotizaciones', data: quotesOverTime.map((q: any) => q.quotes) }]
      });
    }
  }

  private createChart(elementId: string, type: any, data: any, configType: 'default' | 'custom' = 'custom'): void {
    const ctx = document.getElementById(elementId) as HTMLCanvasElement;
    if (!ctx) return;

    let pluginsConfig: any;

    if (configType === 'custom') {
      pluginsConfig = {
        tooltip: { enabled: false },
        datalabels: {
          display: true,
          align: 'center',
          color: 'white',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          borderRadius: 4,
          font: { weight: 'bold' },
          padding: 6,
          textAlign: 'center',
          formatter: (value: number, context: Context) => {
            if (!value) return null;
            return value;
          }
        }
      };
    } else {
      pluginsConfig = {
        tooltip: { enabled: true },
        datalabels: {
          display: false,
        }
      };
    }

    // Ejes para Evolución de Cotizaciones y Cotizaciones por Vendedor
    let axisOptions = {};
    if (elementId === 'quotesOverTimeChart' || elementId === 'sellerQuotesOverTimeChart') {
      axisOptions = {
        scales: {
          x: {
            title: {
              display: true,
              text: 'Fecha',
              font: { weight: 'bold', size: 16 }
            }
          },
          y: {
            title: {
              display: true,
              text: 'Cotizaciones',
              font: { weight: 'bold', size: 16 }
            }
          }
        }
      };
    } else if (elementId === 'quotesBySellerChart') {
      axisOptions = {
        scales: {
          x: {
            title: {
              display: true,
              text: 'Vendedores',
              font: { weight: 'bold', size: 16 }
            }
          },
          y: {
            title: {
              display: true,
              text: 'Cotizaciones',
              font: { weight: 'bold', size: 16 }
            }
          }
        }
      };
    }
    const chart = new Chart(ctx, {
      type,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: pluginsConfig,
        ...axisOptions
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