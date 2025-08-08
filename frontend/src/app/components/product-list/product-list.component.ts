import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
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

  showQtyInput: { [codigo: string]: boolean } = {};
  qty: { [codigo: string]: number } = {};
  error: { [codigo: string]: string } = {};

  openQtyInput(prod: any) {
    this.showQtyInput[prod.codigo] = true;
    this.qty[prod.codigo] = 1;
    this.error[prod.codigo] = '';
  }

  closeQtyInput(prod: any) {
    this.showQtyInput[prod.codigo] = false;
    this.error[prod.codigo] = '';
  }

  confirmAdd(prod: any) {
    const cantidad = this.qty[prod.codigo];
    if (!cantidad || cantidad < 1) {
      this.error[prod.codigo] = 'Cantidad inválida';
      return;
    }
    if (cantidad > prod.stock) {
      this.error[prod.codigo] = 'No hay suficiente stock';
      return;
    }
    this.addToQuote.emit({ producto: prod, cantidad });
    this.showQtyInput[prod.codigo] = false;
    this.error[prod.codigo] = '';
  }
}
