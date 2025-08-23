import { Injectable } from '@angular/core';

export interface Product {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  imagen?: string;
  categoria: string;
  stock?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private items: CartItem[] = [
    {
      product: {
        id: '1',
        codigo: '03-011-0007',
        nombre: 'ANGULO HN 30X30X3MMX6MTS',
        descripcion: 'Ángulo de hierro',
        precio: 15.00,
        imagen: '',
        categoria: 'ANGULOS',
        stock: 300
      },
      quantity: 5
    },
    {
      product: {
        id: '2',
        codigo: 'LMGALV001',
        nombre: 'LÁMINA GALVANIZADA',
        descripcion: 'Lámina galvanizada estándar',
        precio: 45.50,
        imagen: '',
        categoria: 'LAMINAS GALVANIZADAS',
        stock: 100
      },
      quantity: 2
    }
  ];

  getCart(): CartItem[] {
    return this.items;
  }

  addProduct(product: Product, quantity: number = 1) {
    const idx = this.items.findIndex(item => item.product.codigo === product.codigo);
    if (idx >= 0) {
      this.items[idx].quantity += quantity;
    } else {
      this.items.push({ product, quantity });
    }
  }

  removeProduct(codigo: string) {
    this.items = this.items.filter(item => item.product.codigo !== codigo);
  }

  clearCart() {
    this.items = [];
  }

  getTotalItems(): number {
    return this.items.reduce((acc, item) => acc + item.quantity, 0);
  }

  getTotalPrice(): number {
    return this.items.reduce((acc, item) => acc + item.product.precio * item.quantity, 0);
  }
}
