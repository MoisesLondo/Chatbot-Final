import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
  protected readonly detalles = computed(() => this.cotizacion()?.detalles || []);

  private readonly http = inject(HttpClient);

  fetchCotizacion() {
    const id = this.cotizacionId();
    if (!id) return;

    this.http.get(`http://127.0.0.1:8000/cotizacion/${id}`).subscribe({
      next: (response: any) => {
        this.cotizacion.set(response);
      },
      error: (err) => {
        console.error('Error fetching cotización:', err);
        this.cotizacion.set(null);
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