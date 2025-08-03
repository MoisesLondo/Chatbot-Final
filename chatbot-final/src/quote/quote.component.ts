import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { CurrencyPipe, CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-quote',
  standalone: true,
  imports: [RouterModule,CurrencyPipe, CommonModule, FormsModule],
  templateUrl: './quote.component.html',
  styleUrls: ['./quote.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuoteComponent {
  protected readonly cotizacionId = signal('');
  protected readonly cotizacion = signal<any | null>(null);
  protected readonly detalles = signal<any[]>([]); // Cambiar computed a signal para permitir asignaciones directas

  private readonly http = inject(HttpClient);

  fetchCotizacion() {
    const id = this.cotizacionId();
    if (!id) return;

    this.http.get<{ cotizacion: any; detalles: any[] }>(`http://127.0.0.1:8000/cotizacion/${id}`).subscribe({
      next: (response) => {
        this.cotizacion.set(response.cotizacion);
        this.detalles.set(response.detalles);
      },
      error: (err) => {
        console.error('Error fetching cotización:', err);
        this.cotizacion.set(null);
        this.detalles.set([]);
      },
    });
  }

  downloadPDF() {
    const id = this.cotizacionId();
    if (!id) return;

    window.open(`http://127.0.0.1:8000cotizacion/${id}/pdf`, '_blank');
  }

  downloadDOCX() {
    const id = this.cotizacionId();
    if (!id) return;

    window.open(`http://127.0.0.1:8000cotizacion/${id}/docx`, '_blank');
  }
}