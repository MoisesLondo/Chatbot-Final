import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService, CartItem } from '../../services/cart.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent {
  @Output() cotizarEvent = new EventEmitter<void>();
  updateQuantity(codigo: string, newQuantity: number) {
    if (newQuantity < 1) return;
    const item = this.items.find(i => i.product.codigo === codigo);
    if (item) {
      // Validar stock
      if (item.product.stock !== undefined && newQuantity > item.product.stock) {
        item.quantity = item.product.stock;
      } else {
        item.quantity = newQuantity;
      }
      this.cartService.saveCart();
      this.total = this.items.reduce((acc, i) => acc + i.product.precio * i.quantity, 0);
    }
  }
  // Evento para cotizar
  cotizarRequested = false;
  cotizar() {
    this.cotizarRequested = true;
    this.cotizarEvent.emit();
  }
  removeItem(codigo: string) {
    this.cartService.removeProduct(codigo);
    this.items = this.cartService.getCart();
    this.total = this.items.reduce((acc, item) => acc + item.product.precio * item.quantity, 0);
  }
  clearCart() {
    this.cartService.clearCart();
    this.items = [];
    this.total = 0;
  }
  items: CartItem[] = [];
  total: number = 0;

  constructor(private cartService: CartService) {
    this.items = this.cartService.getCart();
    this.total = this.items.reduce((acc, item) => acc + item.product.precio * item.quantity, 0);
  }
}
