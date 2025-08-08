import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import venezuela from 'venezuela';

@Component({
  selector: 'app-cotizacion-modal',
  templateUrl: './cotizacion-modal.component.html',
  styleUrls: ['./cotizacion-modal.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class CotizacionModalComponent {
  step = 1;
  calle = '';
  urbanizacion = '';
  ciudad = '';
  estado = '';
  apellido = '';
  estados: string[] = [];
  ciudades: string[] = [];
  @Input() show = false;
  @Input() productosHtml: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<any>();

  nombre = '';
  tipoDocumento = 'V';
  cedula = '';
  email = '';
  telefono = '';
  codigoTelefono = '0424';
  

  ngOnInit() {
    // Load all states on init
    this.estados = venezuela.pais.map((e: any) => e.estado);
    console.log(this.estados);
  }

  onEstadoChange() {
    // Update cities when state changes
    if (this.estado) {
      const edo = venezuela.pais.find((e: any) => e.estado === this.estado);
      this.ciudades = edo ? edo.municipios.map((m: any) => m.capital) : [];
    } else {
      this.ciudades = [];
    }
    this.ciudad = '';
  }
  onSubmit() {
    // Concatenar la dirección modular
    const direccion = `${this.calle}, ${this.urbanizacion}, ${this.ciudad}, ${this.estado}`;
    const telefonoCompleto = `${this.codigoTelefono}-${this.telefono}`;
    this.submit.emit({
      nombre: `${this.nombre} ${this.apellido}`,
      cedula: this.cedula,
      direccion,
      email: this.email,
      telefono: telefonoCompleto,
    });
  }
}
