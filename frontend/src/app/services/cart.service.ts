import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';

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

export interface CartUpdate {
  type: 'add' | 'remove' | 'clear';
  product?: Product;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private addProductResultSource = new Subject<{ success?: boolean; error?: string }>();
  addProductResult$ = this.addProductResultSource.asObservable();
  /**
   * Borra todos los productos del carrito
   */
  private items: CartItem[] = [];
  private cartUpdateSource = new Subject<CartUpdate>();

  /**
   * Observable que emite cuando el carrito se actualiza.
   */
  cartUpdate$ = this.cartUpdateSource.asObservable();
private botErrorSource = new Subject<string>();
  botError$ = this.botErrorSource.asObservable();
  private notyf = new Notyf();
  constructor() {
    const saved = sessionStorage.getItem('cart_items');
    if (saved) {
      try {
        this.items = JSON.parse(saved);
      } catch {
        this.items = [];
      }
    }
  }

  getCart(): CartItem[] {
    return this.items;
  }

  /**
   * Devuelve los productos actuales en el carrito
   */
  getCartItems(): CartItem[] {
    return this.items;
  }

  addProduct(product: Product, quantity: number = 1) {
    // Validar stock
    if (product.stock !== undefined && quantity > product.stock) {
      this.notyf.error({
        message: `No puedes agregar más de ${product.stock} unidades de ${product.nombre}.`,
        duration: 60000,
        dismissible: true,
        position: {
          x: 'right',
          y: 'top',
        },
      });
      return;
    }
    const idx = this.items.findIndex(item => item.product.codigo === product.codigo);
    if (idx >= 0) {
      const total = this.items[idx].quantity + quantity;
      if (product.stock !== undefined && total > product.stock) {
        // Mantener el toast para este caso
        this.notyf.error({
        message: `No puedes agregar más de ${product.stock} unidades de ${product.nombre}.`,
        duration: 60000,
        dismissible: true,
        position: {
          x: 'right',
          y: 'top',
        },
      });
        return false;
      }
      this.items[idx].quantity += quantity;
    } else {
      this.items.push({ product, quantity });
    }
    this.saveCart();
    this.cartUpdateSource.next({ type: 'add', product });
    this.notyf.success({
      message: `${quantity} x ${product.nombre} agregado al carrito.`,
      duration: 60000,
      dismissible: true,
      position: {
        x: 'right',
        y: 'top',
        },
    });
    return true;
  }

  saveCart() {
    sessionStorage.setItem('cart_items', JSON.stringify(this.items));
  }

  removeProduct(codigo: string) {
    const itemToRemove = this.items.find(item => item.product.codigo === codigo);
    this.items = this.items.filter(item => item.product.codigo !== codigo);
    this.saveCart();
    if (itemToRemove) {
      this.cartUpdateSource.next({ type: 'remove', product: itemToRemove.product });
    }
  }

  clearCart() {
    this.items = [];
    this.saveCart();
    this.cartUpdateSource.next({ type: 'clear' });
  }

  getTotalItems(): number {
    return this.items.reduce((acc, item) => acc + item.quantity, 0);
  }
  getUniqueItemCount(): number {
    return this.items.length;
  }

  getTotalPrice(): number {
    return this.items.reduce((acc, item) => acc + item.product.precio * item.quantity, 0);
  }

  getIVA(tasa: number = 0.16): number {
    return this.getTotalPrice() * tasa;
  }

  getTotalConIVA(tasa: number = 0.16): number {
    const subtotal = this.getTotalPrice();
    return subtotal + (subtotal * tasa);
  }

  processAgregarCarritoMessage(message: string): void {
    if (!message.includes('[AGREGAR_CARRITO]')) return;
    const content = message.replace('[AGREGAR_CARRITO]', '').trim();
    console.log('Contenido a procesar para agregar al carrito:', content);

    // Parsear productos
    const productos: CartItem[] = [];
    const liRegex = /<li>(.+?)<\/li>/g;
    let found = false;
    let match;
    while ((match = liRegex.exec(content)) !== null) {
      found = true;
      const line = match[1];
      // Nuevo regex para extraer codigo si está presente
      const prodMatch = line.match(/(.+?) \(Cantidad: (\d+), precio: ([\d.]+), stock: (\d+)(?:, codigo: ([^)]+))?\)/);
      if (prodMatch) {
        const nombre = prodMatch[1].trim();
        const cantidad = parseInt(prodMatch[2], 10);
        const precio = parseFloat(prodMatch[3]);
        const stock = parseInt(prodMatch[4], 10);
        const codigo = prodMatch[5] ? prodMatch[5].trim() : nombre;
        const product: Product = { id: '', codigo, nombre, precio, categoria: '', stock };
        productos.push({ product, quantity: cantidad });
      }
    }
    // Si no es HTML, procesa por líneas
    if (!found) {
      const lines = content.split('\n').map(l => l.trim()).filter(l => l);
      lines.forEach(line => {
        const prodMatch = line.match(/(.+?) \(Cantidad: (\d+), precio: ([\d.]+), stock: (\d+)(?:, codigo: ([^)]+))?\)/);
        if (prodMatch) {
          const nombre = prodMatch[1].trim();
          const cantidad = parseInt(prodMatch[2], 10);
          const precio = parseFloat(prodMatch[3]);
          const stock = parseInt(prodMatch[4], 10);
          const codigo = prodMatch[5] ? prodMatch[5].trim() : nombre;
          const product: Product = { id: '', codigo, nombre, precio, categoria: '', stock };
          productos.push({ product, quantity: cantidad });
        }
      });
    }
    // Agregar productos al carrito, sumando cantidades si ya existen
    productos.forEach(({ product, quantity }) => {
      this.addProduct(product, quantity);
    });
  }
}
