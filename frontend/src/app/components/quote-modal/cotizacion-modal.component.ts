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
  cedulaError: string | null = null;
  nombreError: string | null = null;
  apellidoError: string | null = null;
  telefonoError: string | null = null;
  emailError: string | null = null;
  calleError: string | null = null;
  direccionError: string | null = null;

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
  validateCedula() {
    const cedulaRegex = /^[VEve]-\d{6,8}$/;
    const rifRegex = /^[VEJPGvejpgc]-\d{8}-\d{1}$/;
    if (!this.cedula || !this.tipoDocumento) {
      this.cedulaError = 'Este campo es obligatorio.';
      return;
    }
    if (this.tipoDocumento === 'V' || this.tipoDocumento === 'E') {
      if (!cedulaRegex.test(`${this.tipoDocumento}-${this.cedula}`)) {
        this.cedulaError = 'Formato de cédula inválido. Ejemplo: V-12345678';
        return;
      }
    } else if (this.tipoDocumento === 'J') {
      if (!rifRegex.test(`${this.tipoDocumento}-${this.cedula}`)) {
        this.cedulaError = 'Formato de RIF inválido. Ejemplo: J-12345678-9';
        return;
      }
    }
    this.cedulaError = null;
  }
  validateNombre() {
    this.nombreError = !this.nombre ? 'Este campo es obligatorio.' : null;
  }
  validateApellido() {
    this.apellidoError = !this.apellido ? 'Este campo es obligatorio.' : null;
  }
  validateTelefono() {
    this.telefonoError = !this.telefono || !/^\d{7}$/.test(this.telefono) ? 'Teléfono inválido. Ejemplo: 1234567' : null;
  }
  validateEmail() {
    this.emailError = !this.email || !/^\S+@\S+\.\S+$/.test(this.email) ? 'Correo inválido.' : null;
  }
  validateCalle() {
    this.calleError = !this.calle ? 'Este campo es obligatorio.' : null;
  }
  validateDireccion() {
    this.direccionError = !this.calle ? 'Este campo es obligatorio.' : null;
  }

  validateAll() {
    this.validateNombre();
    this.validateApellido();
    this.validateCedula();
    this.validateTelefono();
    this.validateEmail();
    this.validateCalle();
    this.validateDireccion();
  }

  onSubmit() {
    this.validateAll();
    if (
      this.nombreError ||
      this.apellidoError ||
      this.cedulaError ||
      this.telefonoError ||
      this.emailError ||
      this.calleError ||
      this.direccionError
    ) {
      return;
    }
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

  getCedulaPlaceholder(): string {
    switch (this.tipoDocumento) {
      case 'V':
        return 'V-12345678';
      case 'E':
        return 'E-12345678';
      case 'J':
        return 'J-12345678-9';
      default:
        return 'Documento';
    }
  }
}
