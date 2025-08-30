import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef} from '@angular/core';
import { CotizacionModalComponent } from '../quote-modal/cotizacion-modal.component';
import { ProductListComponent } from '../product-list/product-list.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputChatComponent } from '../input-chat/input-chat.component';
import { AskPayload, HistoryEntry } from '../../models';
import { ChatService } from '../../services';
import { Router } from '@angular/router';
import { CartService, Product } from '../../services/cart.service';
 
interface Message {
  text: string;
  sender: 'user' | 'bot';
  htmlText?: string;
}

import { CartComponent } from '../cart/cart.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputChatComponent,
    CotizacionModalComponent,
    ProductListComponent,
    CartComponent
  ],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
})
export class ChatComponent implements OnInit, AfterViewInit {
  @ViewChild(CartComponent) cartComponent!: CartComponent;
  showCart = false;
  private sessionId: string;
  constructor(
    private chat: ChatService,
    private cartService: CartService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {
    this.sessionId = sessionStorage.getItem('session_id') ?? crypto.randomUUID();
    sessionStorage.setItem('session_id', this.sessionId);
    console.log('Session ID:', this.sessionId);
  }

  goHome() {
    this.router.navigate(['/']);
  }
  cartItems: { producto: any, cantidad: number }[] = [];
  private addToCartHandler: ((event: { producto: any, cantidad: number }) => void) | null = null;

  setAddToCartHandler(fn: (event: { producto: any, cantidad: number }) => void) {
    this.addToCartHandler = fn;
  }

  onAddToQuote(event: { producto: any, cantidad: number }) {
    if (this.addToCartHandler) {
      this.addToCartHandler(event);
    } else {
      // fallback local (solo para pruebas)
      const idx = this.cartItems.findIndex(p => p.producto.codigo === event.producto.codigo);
      if (idx >= 0) {
        this.cartItems[idx].cantidad += event.cantidad;
      } else {
        this.cartItems.push(event);
      }
    }
  }
  // Extrae el primer array JSON de productos de cualquier string
  extractVisualList(text: string): { items: any[], type: 'productos' | 'categorias' | null } {
    if (!text) return { items: [], type: null };
    const match = text.match(/\[\s*{[\s\S]*?}\s*\]/);
    if (match) {
      try {
        const arr = JSON.parse(match[0]);
        if (Array.isArray(arr) && arr.length > 0) {
          if (arr[0].nombre && arr[0].precio !== undefined) {
            return { items: arr, type: 'productos' };
          } else if (arr[0].nombre && arr[0].precio === undefined) {
            return { items: arr, type: 'categorias' };
          }
        }
      } catch {}
    }
    return { items: [], type: null };
  }
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  isLoadingBotResponse: boolean = false;
  messages: Message[] = [];
  showCotizacionModal = false;
  productosHtml: string = '';


  openCotizacionModal(productosHtml: string) {
    this.productosHtml = productosHtml;
    this.showCotizacionModal = true;
  }


  closeCotizacionModal(cancelado: boolean = false) {
    this.showCotizacionModal = false;
    this.productosHtml = '';
    if (cancelado) {
      this.messages.push(this.buildMsg('Formulario cancelado por el usuario.', 'bot'));
    }
  }


  onCotizacionSubmit(data: any) {
    if (data && typeof data === 'object' && 'isTrusted' in data) {
      return;
    }
  
    const mensaje: string = `[FORMULARIO-ENVIADO]${JSON.stringify({ ...data, productosHtml: this.productosHtml }, null, 2)}`;
    this.addMessage(mensaje);
    this.closeCotizacionModal(false);
  }

  resetChatHistory(): void {
    this.messages = [];
    this.sessionId = crypto.randomUUID();
    sessionStorage.setItem('session_id', this.sessionId);
    // Reiniciar el carrito y limpiar localStorage
    localStorage.removeItem('cart');
    localStorage.removeItem('cart_total');
    localStorage.removeItem('cart_items');
    // Si el CartService tiene método para limpiar, llamarlo también
    if (this.cartService && typeof this.cartService.clearCart === 'function') {
      this.cartService.clearCart();
    }
  }
  // ...existing code...

  ngAfterViewChecked(): void {
    // Detectar si se pidió cotizar desde el carrito
    if (this.cartComponent && this.cartComponent.cotizarRequested) {
      this.cartComponent.cotizarRequested = false;
      this.addMessage('Quiero cotizar los productos que tengo en mi carrito.');
    }
  }

  ngOnInit(): void {
    this.loadHistory();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.scrollToBottom(), 0);
  }

  addMessage(userText: string): void {
    if (userText.includes('[FORMULARIO-ENVIADO]')) {
      // Mostrar solo 'Mensaje Enviado' en el chat para el usuario y NO mostrar el JSON
      this.messages.push(this.buildMsg('Mensaje Enviado', 'user'));
      this.isLoadingBotResponse = true;
      setTimeout(() => this.scrollToBottom(), 0);
    } else if (userText.includes('[ABRIR_FORMULARIO_COTIZACION]')) {
      // Mostrar un mensaje natural relacionado al carrito
      this.messages.push(this.buildMsg('Quiero cotizar los productos que tengo en mi carrito.', 'user'));
      this.isLoadingBotResponse = true;
      setTimeout(() => this.scrollToBottom(), 0);
    } else {
      this.messages.push(this.buildMsg(userText, 'user'));
      this.isLoadingBotResponse = true;
      setTimeout(() => this.scrollToBottom(), 0);
    }

    const payload: AskPayload = { query: userText, session_id: this.sessionId };

    this.chat.askToBot(payload).subscribe({
      next: res => {
        if (res.response) {
          const safeResponse = res.response || '';

          // Detectar [AGREGAR_CARRITO] y extraer productos
          if (safeResponse.includes('[AGREGAR_CARRITO]')) {
            this.cartService.processAgregarCarritoMessage(safeResponse);
            this.messages.push(this.buildMsg('¡Listo! Los productos han sido agregados a tu carrito. Puedes revisarlos y cotizar cuando lo desees. 🛒', 'bot'));
            // No mostrar el mensaje original del bot si contiene [AGREGAR_CARRITO]
            this.isLoadingBotResponse = false;
            this.scrollToBottom();
            return;
          }

          // Detectar [ELIMINAR_DEL_CARRITO] y eliminar producto
          if (safeResponse.includes('[ELIMINAR_DEL_CARRITO]')) {
            // Espera formato: [ELIMINAR_DEL_CARRITO]CODIGO_PRODUCTO
            const match = safeResponse.match(/\[ELIMINAR_DEL_CARRITO\](\S+)/);
            if (match && match[1]) {
              this.cartService.removeProduct(match[1]);
              this.messages.push(this.buildMsg('Producto eliminado del carrito correctamente.', 'bot'));
            }
            this.isLoadingBotResponse = false;
            this.scrollToBottom();
            return;
          }

          // Detectar [VACIAR_CARRITO] y vaciar el carrito
          if (safeResponse.includes('[VACIAR_CARRITO]')) {
            this.cartService.clearCart();
            this.messages.push(this.buildMsg('Todos los productos han sido eliminados del carrito.', 'bot'));
            this.isLoadingBotResponse = false;
            this.scrollToBottom();
            return;
          }

          if (safeResponse.includes('[ABRIR_FORMULARIO_COTIZACION]')) {
            // Construir productosHtml desde el carrito actual
            const cartProducts = this.cartService.getCartItems();
            let productosHtml = '';
            if (cartProducts && cartProducts.length > 0) {
              productosHtml = `<ul class=\"list-disc pl-4\">` +
                cartProducts.map((item: any) => {
                  const nombre = item.product?.nombre || '';
                  const cantidad = item.quantity || 1;
                  return `<li>${nombre} (Cantidad: ${cantidad})</li>`;
                }).join('') + `</ul>`;
            }
            this.messages.push(this.buildMsg('Por favor, completa el formulario de cotización.', 'bot'));
            this.openCotizacionModal(productosHtml);
            this.scrollToBottom();
            this.isLoadingBotResponse = false;
            return;
          }
          // Solo mostrar el mensaje del bot si no contiene [AGREGAR_CARRITO]
          if (!safeResponse.includes('[AGREGAR_CARRITO]')) {
            this.messages.push(this.buildMsg(res.response, 'bot', true));
          }
        } else {
          this.messages.push(this.buildMsg('No se recibió respuesta del bot.', 'bot'));
        }
        setTimeout(() => this.scrollToBottom(), 0);
        this.isLoadingBotResponse = false;
      },
      error: err => {
        console.error(err);
        this.messages.push(this.buildMsg('Error al obtener respuesta del bot.', 'bot'));
        this.isLoadingBotResponse = false;
      }
    });
  }

  // Extraer productos y cantidades del HTML generado por el bot
  private extractProductsFromHtml(html: string): { nombre: string, cantidad: number }[] {
    const regex = /<li>(.*?) \(Cantidad: (\d+)\)<\/li>/g;
    const productos: { nombre: string, cantidad: number }[] = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      productos.push({ nombre: match[1], cantidad: Number(match[2]) });
    }
    return productos;
  }

  private loadHistory(): void {
    this.chat.getHistory(this.sessionId).subscribe({
      next: h => {
        this.messages = h.history.map(this.historyEntryToMsg);
        this.cdr.detectChanges();
        setTimeout(() => this.scrollToBottom(), 0);
      },
      error: err => console.error(err)
    });
  }

  historyEntryToMsg = (e: HistoryEntry): Message => {
    const sender = e.type === 'human' ? 'user' : 'bot';
    if (sender === 'user' && e.content.includes('[FORMULARIO-ENVIADO]')) {
      return this.buildMsg('Mensaje Enviado', 'user');
    }
    // Ocultar [ABRIR_FORMULARIO_COTIZACION] en el historial
    if (sender === 'user' && e.content.includes('[ABRIR_FORMULARIO_COTIZACION]')) {
      return { text: '', sender };
    }
    // Mostrar mensaje amigable si el bot envía [AGREGAR_CARRITO]
    if (sender === 'bot' && e.content.includes('[AGREGAR_CARRITO]')) {
      return this.buildMsg('¡Listo! Los productos han sido agregados a tu carrito. Puedes revisarlos y cotizar cuando lo desees. 🛒', 'bot');
    }
    return this.buildMsg(e.content, sender, sender === 'bot');
  };

  private buildMsg(text: string | undefined, sender: 'user' | 'bot', withHtml: boolean = false): Message {
    const safeText = text || '';
    if (withHtml && sender === 'bot') {
      return {
        text: safeText,
        sender,
        htmlText: safeText.replace(/\n/g, '<br>')
      };
    }
    return {
      text: safeText,
      sender
    };
  }

  private scrollToBottom(): void {
    try {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }

  getStaticTempUrl(text: string): string | null {
    const match = text.match(/\/static\/temp\/[^\s]+/);
    if (match && match[0]) {
      return 'http://localhost:8000' + match[0];
    }
    return null;
  }

}
