import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-product-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-modal.component.html',
  styleUrls: ['./product-modal.component.css']
})
export class ProductModalComponent implements OnChanges {
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['product'] && this.product) {
      this.quantity = this.isDecimalStock() ? 1 : 1; 
      this.error = '';
    }
  }
  @Input() product: any | null = null;
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<{ product: any, quantity: number }>();

  quantity: number = 1;
  error: string = '';


  onConfirm(): void {
    if (!this.product) return;

    if (this.quantity < 1) {
      this.error = 'La cantidad debe ser al menos 1.';
      return;
    }
    if (this.quantity > this.product.stock) {
      this.error = 'No hay suficiente stock disponible.';
      return;
    }
    this.confirm.emit({ product: this.product, quantity: this.quantity });
  }

  onClose(): void {
  document.body.style.overflow = '';
  this.close.emit();
  }

  isDecimalStock(): boolean {
    if (!this.product || this.product.stock === undefined) {
      return false;
    }
    // Si el número módulo 1 no es 0, entonces tiene decimales.
    return this.product.stock % 1 !== 0;
  }

  onQuantityInput(): void {
    // Si el stock es decimal, no hacemos nada y permitimos cualquier valor.
    if (this.isDecimalStock()) {
      return;
    }

    // Si el stock es entero y el valor actual tiene decimales...
    if (this.quantity && !Number.isInteger(this.quantity)) {
      // ...lo redondeamos hacia abajo para eliminar el decimal.
      this.quantity = Math.floor(this.quantity);
    }
  }

  getUnit(unit: string, quantity: number): string {
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
        return unit;
    }
  }
}
