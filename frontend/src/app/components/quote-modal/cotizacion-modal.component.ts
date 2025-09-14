import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { estadosVenezuela } from '../../../types/venezuela';
import { CartService, CartItem } from '../../services';

@Component({
  selector: 'app-cotizacion-modal',
  templateUrl: './cotizacion-modal.component.html',
  styleUrls: ['./cotizacion-modal.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class CotizacionModalComponent {

  constructor(private cartService: CartService) {
    }

    subtotal: number = 0;
  iva: number = 0;
  total: number = 0;
  public productosParaMostrar: CartItem[] = [];
  estadoError: string | null = null;
  municipioError: string | null = null;
  parroquiaError: string | null = null;
  validateEstado() {
    this.estadoError = !this.estado ? 'Este campo es obligatorio.' : null;
  }
  validateMunicipio() {
    this.municipioError = !this.municipio ? 'Este campo es obligatorio.' : null;
  }
  validateParroquia() {
    this.parroquiaError = !this.parroquia ? 'Este campo es obligatorio.' : null;
  }
  urbanizacionError: string | null = null;
  validateUrbanizacion() {
    this.urbanizacionError = !this.urbanizacion ? 'Este campo es obligatorio.' : null;
  }
  nextStep1() {
    this.validateNombre();
    this.validateApellido();
    this.validateCedula();
    this.validateTelefono();
    this.validateEmail();
    if (!this.nombreError && !this.apellidoError && !this.cedulaError && !this.telefonoError && !this.emailError && this.nombre && this.apellido && this.cedula && this.email && this.telefono) {
      this.step = 2;
    }
  }

  nextStep2() {
    this.validateCalle();
    this.validateDireccion();
    this.validateUrbanizacion();
    this.validateEstado();
    this.validateMunicipio();
    this.validateParroquia();
    if (!this.direccionError && !this.urbanizacionError && !this.estadoError && !this.municipioError && !this.parroquiaError && this.calle && this.urbanizacion && this.municipio && this.estado && this.parroquia) {
      this.step = 3;
    }
  }
  onNameKeyPress(event: KeyboardEvent) {
    const key = event.key;
    const regex = /^[a-zA-ZÀ-ÿ\s]*$/; // Letras y espacios, incluyendo acentos
    if (!regex.test(key) && key.length === 1) {
      event.preventDefault();
    }
  }
  onCedulaKeyPress(event: KeyboardEvent) {
    const key = event.key;
      // Solo números
      if (key < '0' || key > '9') {
        event.preventDefault();
      }
  }

  onTelefonoKeyPress(event: KeyboardEvent) {
    const key = event.key;
    if (key < '0' || key > '9') {
      event.preventDefault();
    }
  }
  step = 1;
  calle = '';
  urbanizacion = '';
  municipio = '';
  parroquia = '';
  estado = '';
  apellido = '';
  estados: string[] = [];
  municipios: string[] = [];
  parroquias: string[] = [];
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

    onCedulaInput(event: Event) {
      const input = event.target as HTMLInputElement;
      const maxLen = this.tipoDocumento === 'J' ? 10 : 8;
      let value = input.value;
      value = value.replace(/[^0-9]/g, '');
      if (value.length > maxLen) value = value.slice(0, maxLen);
      this.cedula = value;
    }

    onTelefonoInput(event: Event) {
      const input = event.target as HTMLInputElement;
      let value = input.value.replace(/[^0-9]/g, '');
      if (value.length > 7) value = value.slice(0, 7);
      this.telefono = value;
    }

  ngOnInit() {
    // Load all states on init
    this.estados = estadosVenezuela[0].map((e: any) => e.estado);
    this.productosParaMostrar = this.cartService.getCart();
    this.subtotal = this.cartService.getTotalPrice();
    this.iva = this.cartService.getIVA();
    this.total = this.cartService.getTotalConIVA();
  }

  onEstadoChange() {
    // Update municipios when estado changes
    if (this.estado) {
      const edo = estadosVenezuela[0].find((e: any) => e.estado === this.estado);
      this.municipios = edo ? edo.municipios.map((m: any) => m.municipio) : [];
    } else {
      this.municipios = [];
    }
    this.municipio = '';
  }
  onMunicipioChange() {
    // Update parroquias when municipio changes
    if (this.municipio) {
      const edo = estadosVenezuela[0].find((e: any) => e.estado === this.estado);
      const mun = edo?.municipios.find((m: any) => m.municipio === this.municipio);
      this.parroquias = mun ? mun.parroquias : [];
    } else {
      this.parroquias = [];
    }
    this.parroquia = '';
  }

  validateCedula() {
    const cedulaRegex = /^[VEve]-\d{6,8}$/;
    const rifRegex = /^[VEJPGvejpgc]-\d{9}$/;
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
        this.cedulaError = 'Formato de RIF inválido. Ejemplo: J-123456789';
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
    if (!this.telefono) {
      this.telefonoError = 'Este campo es obligatorio.';
    } else if (!/^\d{7}$/.test(this.telefono)) {
      this.telefonoError = 'Teléfono inválido. Ejemplo: 1234567';
    } else {
      this.telefonoError = null;
    }
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
    const direccion = `${this.calle}, ${this.urbanizacion}, ${this.municipio}, ${this.parroquia}, ${this.estado}`;
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
        return '22345678';
      case 'E':
        return '84222456';
      case 'J':
        return '223456789';
      default:
        return 'Documento';
    }
  }

  getUnit(unit: string | undefined, quantity: number | undefined): string {
    switch (unit) {
      case 'KILOGRAMO':
        return quantity === 1 ? 'kilogramo' : 'kilogramos';
      case 'UNIDAD':
        return quantity === 1 ? 'unidad' : 'unidades';
      case 'METRO':
        return quantity === 1 ? 'metro' : 'metros';
      case 'PIEZA':
        return quantity === 1 ? 'pieza' : 'piezas';
      default:
        return unit ? unit.toLowerCase() : '';
    }
  }
}
