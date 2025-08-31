import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { CurrencyPipe, CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface SearchCriteria {
  cedula_rif: string;
  nombre_cliente: string;
  cliente_email: string;
  cliente_telefono: string;
  producto: string;
  total_min: number | null;
  total_max: number | null;
  fecha_desde: string;
  fecha_hasta: string;
}

interface StatusSearch {
  estado: 'en_espera' | 'convertido' | 'perdido' | '';
  fecha_desde: string;
  fecha_hasta: string;
  vendedor: string;
}

@Component({
  selector: 'app-quote',
  standalone: true,
  imports: [RouterModule, CurrencyPipe, CommonModule, FormsModule, DatePipe],
  templateUrl: './quote.component.html',
  styleUrls: ['./quote.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuoteComponent {

protected readonly isLoading = signal(false);

  // Existing signals for single quote search
  protected readonly cotizacionId = signal('');
  protected readonly cotizacion = signal<any | null>(null);
  protected readonly detalles = signal<any[]>([]);

  // New signals for multiple search functionality
  protected readonly searchType = signal<'id' | 'criteria' | 'status'>('id');
  protected readonly cotizacionesList = signal<any[]>([]);
  protected readonly hasSearched = signal(false);

  // Search criteria
  protected searchCriteria: SearchCriteria = {
    cedula_rif: '',
    nombre_cliente: '',
    cliente_email: '',
    cliente_telefono: '',
    producto: '',
    total_min: null,
    total_max: null,
    fecha_desde: '',
    fecha_hasta: ''
  };

  // Status search criteria
  protected statusSearch: StatusSearch = {
    estado: '',
    fecha_desde: '',
    fecha_hasta: '',
    vendedor: ''
  };

  private readonly http = inject(HttpClient);

  // Set search type and clear previous results
  setSearchType(type: 'id' | 'criteria' | 'status') {
    this.searchType.set(type);
    this.clearResults();
  }

  // Clear all results
  clearResults() {
    this.cotizacion.set(null);
    this.detalles.set([]);
    this.cotizacionesList.set([]);
    this.cotizacionId.set('');
    this.hasSearched.set(false);
  }

  // Original single quote search (unchanged)
fetchCotizacion() {
  const id = this.cotizacionId();
  if (!id) return;

  this.isLoading.set(true);
  this.http.get<{ cotizacion: any; detalles: any[] }>(`http://127.0.0.1:8000/cotizacion/${id}`).subscribe({
    next: (response) => {
      if (response.cotizacion) {
        // Asegurarse de que los datos necesarios existan
        this.cotizacion.set({
          ...response.cotizacion,
          fecha_creacion: response.cotizacion.fecha_creacion || null,
          estado: response.cotizacion.estado || 'Estado no disponible',
        });

        this.http.get(`http://127.0.0.1:8000/cotizacion/${id}/pdf`).subscribe({
          next: () => console.log('PDF generation triggered successfully.'),
          error: (err) => console.error('Error triggering PDF generation:', err)
        });

        this.http.get(`http://127.0.0.1:8000/cotizacion/${id}/docx`).subscribe({
          next: () => console.log('DOCX generation triggered successfully.'),
          error: (err) => console.error('Error triggering DOCX generation:', err)
        });
      } else {
        this.cotizacion.set(null);
      }
      this.detalles.set(response.detalles || []);
      this.hasSearched.set(true);
      this.isLoading.set(false);
    },
    error: (err) => {
      console.error('Error fetching cotización:', err);
      this.cotizacion.set(null);
      this.detalles.set([]);
      this.hasSearched.set(true);
      this.isLoading.set(false);
    },
  });
}

  // New multiple criteria search
  searchByCriteria() {
    if (!this.hasSearchCriteria()) return;

    // Build query parameters
    const params = new URLSearchParams();
    
    if (this.searchCriteria.cedula_rif) {
      params.append('cedula_rif', this.searchCriteria.cedula_rif);
    }
    if (this.searchCriteria.nombre_cliente) {
      params.append('nombre_cliente', this.searchCriteria.nombre_cliente);
    }
    if (this.searchCriteria.cliente_email) {
      params.append('cliente_email', this.searchCriteria.cliente_email);
    }
    if (this.searchCriteria.cliente_telefono) {
      params.append('cliente_telefono', this.searchCriteria.cliente_telefono);
    }
    if (this.searchCriteria.producto) {
      params.append('producto', this.searchCriteria.producto);
    }
    if (this.searchCriteria.total_min !== null) {
      params.append('total_min', this.searchCriteria.total_min.toString());
    }
    if (this.searchCriteria.total_max !== null) {
      params.append('total_max', this.searchCriteria.total_max.toString());
    }
    if (this.searchCriteria.fecha_desde) {
      params.append('fecha_desde', this.searchCriteria.fecha_desde);
    }
    if (this.searchCriteria.fecha_hasta) {
      params.append('fecha_hasta', this.searchCriteria.fecha_hasta);
    }

    this.http.get<any[]>(`http://127.0.0.1:8000/cotizaciones/search?${params.toString()}`).subscribe({
      next: (cotizaciones) => {
        this.cotizacionesList.set(cotizaciones);
        this.hasSearched.set(true);
      },
      error: (err) => {
        console.error('Error searching cotizaciones:', err);
        this.cotizacionesList.set([]);
        this.hasSearched.set(true);
        
        // Mock data for development
        this.loadMockSearchResults();
      },
    });
  }

  // New status search
  searchByStatus() {
    if (!this.statusSearch.estado) return;

    // Build query parameters
    const params = new URLSearchParams();
    params.append('estado', this.statusSearch.estado);
    
    if (this.statusSearch.fecha_desde) {
      params.append('fecha_desde', this.statusSearch.fecha_desde);
    }
    if (this.statusSearch.fecha_hasta) {
      params.append('fecha_hasta', this.statusSearch.fecha_hasta);
    }
    if (this.statusSearch.vendedor) {
      params.append('vendedor', this.statusSearch.vendedor);
    }

    this.http.get<any[]>(`http://127.0.0.1:8000/cotizaciones/status?${params.toString()}`).subscribe({
      next: (cotizaciones) => {
        this.cotizacionesList.set(cotizaciones);
        this.hasSearched.set(true);
      },
      error: (err) => {
        console.error('Error searching by status:', err);
        this.cotizacionesList.set([]);
        this.hasSearched.set(true);
        
        // Mock data for development
        this.loadMockStatusResults();
      },
    });
  }

  // Load mock data for development
  private loadMockSearchResults() {
    const mockResults = [
      {
        id: 'COT-2024-001',
        nombre_cliente: 'Juan Pérez',
        cedula_rif: 'V-12345678',
        cliente_email: 'juan@email.com',
        cliente_telefono: '+58 414 123-4567',
        fecha_creacion: '2024-01-15T10:30:00Z',
        estado: 'en_espera',
        total: 15000.00
      },
      {
        id: 'COT-2024-002',
        nombre_cliente: 'María González',
        cedula_rif: 'V-87654321',
        cliente_email: 'maria@email.com',
        cliente_telefono: '+58 424 987-6543',
        fecha_creacion: '2024-01-16T14:20:00Z',
        estado: 'convertido',
        total: 8500.00
      },
      {
        id: 'COT-2024-003',
        nombre_cliente: 'Carlos Rodríguez',
        cedula_rif: 'J-40123456-7',
        cliente_email: 'carlos@empresa.com',
        cliente_telefono: '+58 212 555-0123',
        fecha_creacion: '2024-01-17T09:15:00Z',
        estado: 'perdido',
        total: 25000.00
      }
    ];
    
    this.cotizacionesList.set(mockResults);
    this.hasSearched.set(true);
  }

  // Load mock status results
  private loadMockStatusResults() {
    const estado = this.statusSearch.estado;
    let mockResults: any[] = [];

    if (estado === 'en_espera') {
      mockResults = [
        {
          id: 'COT-2024-004',
          nombre_cliente: 'Ana Martínez',
          cedula_rif: 'V-11111111',
          cliente_email: 'ana@email.com',
          cliente_telefono: '+58 414 111-1111',
          fecha_creacion: '2024-01-18T08:00:00Z',
          estado: 'en_espera',
          total: 12000.00
        },
        {
          id: 'COT-2024-005',
          nombre_cliente: 'Pedro López',
          cedula_rif: 'V-22222222',
          cliente_email: 'pedro@email.com',
          cliente_telefono: '+58 424 222-2222',
          fecha_creacion: '2024-01-19T10:30:00Z',
          estado: 'en_espera',
          total: 18500.00
        }
      ];
    } else if (estado === 'convertido') {
      mockResults = [
        {
          id: 'COT-2024-006',
          nombre_cliente: 'Luis García',
          cedula_rif: 'V-33333333',
          cliente_email: 'luis@email.com',
          cliente_telefono: '+58 414 333-3333',
          fecha_creacion: '2024-01-20T11:15:00Z',
          estado: 'convertido',
          total: 35000.00
        }
      ];
    } else if (estado === 'perdido') {
      mockResults = [
        {
          id: 'COT-2024-007',
          nombre_cliente: 'Carmen Silva',
          cedula_rif: 'V-44444444',
          cliente_email: 'carmen@email.com',
          cliente_telefono: '+58 424 444-4444',
          fecha_creacion: '2024-01-21T13:45:00Z',
          estado: 'perdido',
          total: 9500.00
        }
      ];
    }
    
    this.cotizacionesList.set(mockResults);
    this.hasSearched.set(true);
  }

  // Check if any search criteria is filled
  hasSearchCriteria(): boolean {
    return !!(
      this.searchCriteria.cedula_rif ||
      this.searchCriteria.nombre_cliente ||
      this.searchCriteria.cliente_email ||
      this.searchCriteria.cliente_telefono ||
      this.searchCriteria.producto ||
      this.searchCriteria.total_min !== null ||
      this.searchCriteria.total_max !== null ||
      this.searchCriteria.fecha_desde ||
      this.searchCriteria.fecha_hasta
    );
  }

  // Clear search criteria
  clearSearchCriteria() {
    this.searchCriteria = {
      cedula_rif: '',
      nombre_cliente: '',
      cliente_email: '',
      cliente_telefono: '',
      producto: '',
      total_min: null,
      total_max: null,
      fecha_desde: '',
      fecha_hasta: ''
    };
    this.clearResults();
  }

  // Clear status search
  clearStatusSearch() {
    this.statusSearch = {
      estado: '',
      fecha_desde: '',
      fecha_hasta: '',
      vendedor: ''
    };
    this.clearResults();
  }

  // Get status label for display
  getStatusLabel(estado: string): string {
    const labels: { [key: string]: string } = {
      'en_espera': 'En Espera',
      'convertido': 'Convertido',
      'perdido': 'Perdido'
    };
    return labels[estado] || estado;
  }

  // View quote details from search results
  viewQuoteDetails(quoteId: string) {
    this.cotizacionId.set(quoteId);
    this.setSearchType('id');
    this.fetchCotizacion();
  }

  // Download functions for search results
  downloadQuotePDF(quoteId: string) {
    window.open(`http://127.0.0.1:8000/cotizacion/${quoteId}/pdf`, '_blank');
  }

  downloadQuoteDOCX(quoteId: string) {
    window.open(`http://127.0.0.1:8000/cotizacion/${quoteId}/docx`, '_blank');
  }

  // downloadPDF() {
  //   const id = this.cotizacionId();
  //   if (!id) return;
  //   window.open(`http://127.0.0.1:8000/cotizacion/${id}/pdf`, '_blank');
  // }

  // downloadDOCX() {
  //   const id = this.cotizacionId();
  //   if (!id) return;
  //   window.open(`http://127.0.0.1:8000/cotizacion/${id}/docx`, '_blank');
  // }
}