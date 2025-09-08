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
  this.loadDashboardData(); // Nos aseguramos que el loader esté activo

  forkJoin({
    stats: this.loadStats(),
    leads: this.loadLeads()
  }).pipe(
    finalize(() => {
      this.isLoading.set(false); // Desactiva el loader al final (éxito o error)
      this.cdr.markForCheck();  // Notifica a Angular para que actualice la vista
    })
  ).subscribe({
    next: (responses) => {
      // Procesamos la respuesta de las stats
      const statsData = responses.stats;
      this.stats.totalLeads = statsData.totalLeads;
      this.stats.totalQuotes = statsData.totalQuotes;
      this.stats.most_active_seller = statsData.mostActiveSeller;
      this.stats.most_quoted_product = statsData.mostQuotedProduct;
      this.stats.avgTicket = statsData.avgTicket || 0;
      this.stats.totalClients = statsData.totalClients || 0;
      console.log('Estadísticas cargadas:', this.stats);

      // Procesamos la respuesta de los leads
      const leadsData = responses.leads;
      this.leads = leadsData.map(lead => ({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        date: new Date(lead.date)
      }));
      console.log('Leads cargados:', this.leads);
    },
    error: (err) => {
      console.error('Error cargando datos del dashboard', err);
      // Aquí podrías mostrar un mensaje de error en la UI
    }
  });
}

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initCharts();
    }, 300);
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
      // ... etc ...

      // --- INICIO DE LA SOLUCIÓN ---
      // Aquí está la clave. 'responses.leads' es la data cruda de la API.
      const leadsFromApi = responses.leads;

      // Usamos .map() para transformar cada objeto de la API
      // a la estructura que nuestra interfaz 'Lead' espera.
      this.leads = leadsFromApi.map(apiLead => {
        return {
          id: apiLead.id, // Asegúrate de que 'apiLead.id' exista en la respuesta
          name: apiLead.name, // o si es 'apiLead.full_name', cámbialo aquí
          email: apiLead.email,
          phone: apiLead.phone,
          date: new Date(apiLead.date) // Convertimos el string de fecha a un objeto Date
        };
      });
      // --- FIN DE LA SOLUCIÓN ---

      console.log('Leads cargados y transformados:', this.leads);
    },
    error: (err) => {
      console.error('Error cargando datos del dashboard', err);
    }
  });
}
}