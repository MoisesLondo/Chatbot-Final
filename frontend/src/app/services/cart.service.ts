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
  /**
   * Borra todos los productos del carrito
   */
  private items: CartItem[] = [];

  constructor() {
    const saved = localStorage.getItem('cart_items');
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
      alert(`No puedes agregar más de ${product.stock} unidades de ${product.nombre}.`);
      return;
    }
    const idx = this.items.findIndex(item => item.product.codigo === product.codigo);
    if (idx >= 0) {
      const total = this.items[idx].quantity + quantity;
      if (product.stock !== undefined && total > product.stock) {
        alert(`No puedes tener más de ${product.stock} unidades de ${product.nombre} en el carrito.`);
        return;
      }
      this.items[idx].quantity += quantity;
    } else {
      this.items.push({ product, quantity });
    }
    this.saveCart();
  }

  saveCart() {
    localStorage.setItem('cart_items', JSON.stringify(this.items));
  }

  removeProduct(codigo: string) {
    this.items = this.items.filter(item => item.product.codigo !== codigo);
    this.saveCart();
  }

  clearCart() {
    this.items = [];
    this.saveCart();
  }

  getTotalItems(): number {
    return this.items.reduce((acc, item) => acc + item.quantity, 0);
  }

  getTotalPrice(): number {
    return this.items.reduce((acc, item) => acc + item.product.precio * item.quantity, 0);
  }

  /**
   * Procesa un mensaje del bot con la etiqueta [AGREGAR_CARRITO] y agrega los productos al carrito.
   * Soporta formato HTML tipo lista:
   * [AGREGAR_CARRITO]\n<ul class=...><li>Producto 1 (Cantidad: X, precio: Y)</li>...</ul>
   */
  processAgregarCarritoMessage(message: string): void {
    if (!message.startsWith('[AGREGAR_CARRITO]')) return;
    const content = message.replace('[AGREGAR_CARRITO]', '').trim();

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
    this.saveCart();
  }
}
