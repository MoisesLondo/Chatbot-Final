import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService, CartItem } from '../../services/cart.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css']
})
export class CartComponent {
  items: CartItem[] = [];
  total: number = 0;

  constructor(private cartService: CartService) {
    this.items = this.cartService.getCart();
    this.total = this.items.reduce((acc, item) => acc + item.product.precio * item.quantity, 0);
  }
}
