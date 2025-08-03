import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-cotizacion-modal',
  templateUrl: './cotizacion-modal.component.html',
  styleUrls: ['./cotizacion-modal.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class CotizacionModalComponent {
  @Input() show = false;
  @Input() productosHtml: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<any>();

  nombre = '';
  cedula = '';
  direccion = '';
  email = '';
  telefono = '';


  onSubmit() {
    // Emitir solo los datos del formulario, nunca el evento del formulario
    this.submit.emit({
      nombre: this.nombre,
      cedula: this.cedula,
      direccion: this.direccion,
      email: this.email,
      telefono: this.telefono,
    });
  }
}
