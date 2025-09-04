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
  }

  onTabChange(type: 'id' | 'criteria' | 'status') {
  this.clearResults();
  this.setSearchType(type);
}
  // Clear all results
  clearResults() {
    this.cotizacion.set(null);
    this.detalles.set([]);
    this.cotizacionesList.set([]);
    // this.cotizacionId.set('');
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
        // console.log('Cotización data:', response.cotizacion);
        // Asegurarse de que los datos necesarios existan
        this.cotizacion.set({
          ...response.cotizacion,
          fecha_creacion: response.cotizacion.created_at || null,
        });

      } else {
        this.cotizacion.set(null);
      }
      this.detalles.set(response.detalles || []);
      this.hasSearched.set(true);
      this.isLoading.set(false);

      this.http.get(`http://127.0.0.1:8000/cotizacion/${id}/pdf`).subscribe({
        next: () => console.log('PDF generado correctamente.'),
        error: (err) => console.error('Error generando PDF:', err)
      });
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
    this.isLoading.set(true);
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
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error searching cotizaciones:', err);
        this.cotizacionesList.set([]);
        this.hasSearched.set(true);
        this.isLoading.set(false);
      },
    });
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

  // View quote details from search results
  viewQuoteDetails(quoteId: string) {
  this.setSearchType('id');
  this.cotizacionId.set(quoteId);
  this.fetchCotizacion();
  }

  // Download functions for search results
  downloadQuotePDF(quoteId: string) {
    this.http.get(`http://127.0.0.1:8000/cotizacion/${quoteId}/pdf`).subscribe({
          next: () => console.log('PDF generation triggered successfully.'),
          error: (err) => console.error('Error triggering PDF generation:', err)
        });
  }

  downloadQuoteDOCX(quoteId: string) {
    this.http.get(`http://127.0.0.1:8000/cotizacion/${quoteId}/docx`).subscribe({
          next: () => console.log('DOCX generation triggered successfully.'),
          error: (err) => console.error('Error triggering DOCX generation:', err)
        });
  }
}