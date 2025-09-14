import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-product-list',
  standalone: true,
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css'],
  imports: [CommonModule, FormsModule]
})
export class ProductListComponent {
  @Input() products: any[] = [];
  @Input() title: string = '';

  @Output() addToQuote = new EventEmitter<{producto: any, cantidad: number}>();

  @Input() openProductModal: (product: any) => void = () => {};

  @Output() categoryClicked = new EventEmitter<any>();

  onCategoryClick(category: any) {
    this.categoryClicked.emit(category);
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
