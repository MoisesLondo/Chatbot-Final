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
      this.calcularTotales();
    }
  }
  // Evento para cotizar
  cotizarRequested = false;
  cotizar() {
    this.cotizarRequested = true;
    this.cotizarEvent.emit();
  }
  showDeleteModal: boolean = false;
  itemToDelete: CartItem | null = null;
  iva: number = 0;
totalConIva: number = 0;

  openDeleteModal(item: CartItem) {
    this.itemToDelete = item;
    this.showDeleteModal = true;
  }

  closeDeleteModal() {
    this.itemToDelete = null;
    this.showDeleteModal = false;
  }

  confirmDelete() {
    if (this.itemToDelete) {
      this.cartService.removeProduct(this.itemToDelete.product.codigo);
      this.items = this.cartService.getCart();
      this.calcularTotales();
      this.closeDeleteModal();
    }
  }
  clearCart() {
    this.cartService.clearCart();
    this.items = [];
    this.calcularTotales();
  }
  items: CartItem[] = [];
  total: number = 0;

  constructor(private cartService: CartService) {
    this.items = this.cartService.getCart();
    this.calcularTotales();
  }

  calcularTotales() {
    this.total = this.items.reduce((acc, item) => acc + item.product.precio * item.quantity, 0);
    this.iva = this.total * 0.16;
    this.totalConIva = this.total + this.iva;
  }
}
