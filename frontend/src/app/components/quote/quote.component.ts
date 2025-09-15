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
  today = new Date().toISOString().split('T')[0];
  // Solo permite números en Total Mínimo
  onTotalMinInput(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input && input.value !== undefined) {
      const value = input.value.replace(/[^0-9]/g, '');
  this.searchCriteria.total_min = value ? Number(value) : null;
    }
  }

  // Solo permite números en Total Máximo
  onTotalMaxInput(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input && input.value !== undefined) {
      const value = input.value.replace(/[^0-9]/g, '');
  this.searchCriteria.total_max = value ? Number(value) : null;
    }
  }
  // Solo permite números en el input
  onCedulaRifInput(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input && input.value !== undefined) {
      const value = input.value.replace(/[^0-9]/g, '');
      this.cedulaRifNumero = value;
    }
  }

  // Cambia el placeholder dinámicamente y limpia el número
  onCedulaRifTipoChange() {
    this.cedulaRifNumero = '';
    this.updateCedulaRif();
  }

  protected readonly isLoading = signal(false);
  protected readonly cotizacionId = signal('');
  protected readonly cotizacion = signal<any | null>(null);
  protected readonly detalles = signal<any[]>([]);
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

  // Validation error properties
  cedulaRifError: string = '';
  emailError: string = '';
  telefonoError: string = '';
  totalMinError: string = '';
  totalMaxError: string = '';

  // Cedula/RIF select logic
  cedulaRifTipo: string = 'V';
  cedulaRifNumero: string = '';

  codigoTelefono: string = '0414';
  telefono: string = '';

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
      this.searchCriteria.fecha_hasta ||
      this.searchCriteria.cedula_rif && !this.cedulaRifError
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

  // Actualiza el modelo y valida Cédula/RIF
updateCedulaRif() {
  const tipo = this.cedulaRifTipo;
  const numero = this.cedulaRifNumero.trim();
  if (!numero) {
    this.searchCriteria.cedula_rif = '';
    this.cedulaRifError = '';
    return;
  }
  let rifRegex;
  let minDigits = 7;
  let value = '';
  if (tipo === 'J') {
    rifRegex = /^J-\d{9,10}$/i;
    minDigits = 9;
    value = `J-${numero}`;
  } else if (tipo === 'V') {
    rifRegex = /^V-\d{7,8}$/i;
    minDigits = 7;
    value = `V-${numero}`;
  } else if (tipo === 'E') {
    rifRegex = /^E-\d{7,8}$/i;
    minDigits = 7;
    value = `E-${numero}`;
  } else {
    // Sin prefijo, solo números (mínimo 6 dígitos)
    rifRegex = /^\d{6,10}$/;
    minDigits = 6;
    value = numero;
  }
  this.searchCriteria.cedula_rif = value;
  if (!rifRegex.test(value) || numero.length < minDigits) {
    if (tipo === 'J') {
      this.cedulaRifError = 'El RIF debe tener al menos 9 dígitos. Ejemplo: J-297507121';
    } else if (tipo === 'V') {
      this.cedulaRifError = 'Formato inválido. Ejemplo: V-12345678';
    } else if (tipo === 'E') {
      this.cedulaRifError = 'Formato inválido. Ejemplo: E-12345678';
    } else {
      this.cedulaRifError = 'Formato inválido. Ejemplo: 12345678';
    }
  } else {
    this.cedulaRifError = '';
  }
}

// Validate Email
validateEmail() {
  const value = this.searchCriteria.cliente_email?.trim();
  if (!value) {
    this.emailError = '';
    return;
  }
  const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  if (!emailRegex.test(value)) {
    this.emailError = 'Email inválido.';
  } else {
    this.emailError = '';
  }
}

// Validate Teléfono
validateTelefono() {
  const value = this.telefono?.trim();
  this.searchCriteria.cliente_telefono = value;
  if (!value) {
    this.telefonoError = '';
    return;
  }
  if (!/^[0-9]{7}$/.test(value)) {
    this.telefonoError = 'Debe contener exactamente 7 dígitos.';
  } else {
    this.telefonoError = '';
  }
}

// Validate Total Min
validateTotalMin() {
  const value = this.searchCriteria.total_min;
  if (value !== null && value < 0) {
    this.totalMinError = 'Debe ser mayor o igual a 0.';
  } else {
    this.totalMinError = '';
  }
}

// Validate Total Max
validateTotalMax() {
  const value = this.searchCriteria.total_max;
  if (value !== null && value < 0) {
    this.totalMaxError = 'Debe ser mayor o igual a 0.';
  } else {
    this.totalMaxError = '';
  }
}

// Check if any form error exists
hasFormErrors(): boolean {
  return !!(
    this.cedulaRifError ||
    this.emailError ||
    this.telefonoError ||
    this.totalMinError ||
    this.totalMaxError
  );
}

// Prevent non-numeric input in phone field
blockNonNumeric(event: KeyboardEvent) {
  const charCode = event.key.charCodeAt(0);
  // Only allow numbers (0-9)
  if (charCode < 48 || charCode > 57) {
    event.preventDefault();
  }
}
ngOnInit(): void {
  // Sync telefono with searchCriteria.cliente_telefono on init
  this.telefono = this.searchCriteria.cliente_telefono || '';
}
}