import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, AfterViewChecked, OnDestroy} from '@angular/core';
import { CotizacionModalComponent } from '../quote-modal/cotizacion-modal.component';
import { ProductListComponent } from '../product-list/product-list.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputChatComponent } from '../input-chat/input-chat.component';
import { AskPayload, HistoryEntry } from '../../models';
import { ChatService } from '../../services';
import { Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { ProductModalComponent } from '../product-modal/product-modal.component';
import { Subscription } from 'rxjs';

 
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
    CartComponent,
    ProductModalComponent
  ],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
})
export class ChatComponent implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy {
  private shouldScrollToBottom = false;
  @ViewChild(CartComponent) cartComponent!: CartComponent;
  showCart = false;
  private sessionId: string;
  cartItemCount = 0;
  animateCartIcon = false;
  private cartUpdateSubscription: Subscription = new Subscription();
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
    this.cartService.addProduct(event.producto, event.cantidad);
    // Opcional: mostrar notificación/feedback
    console.log(`${event.cantidad} de ${event.producto.nombre} agregado(s) al carrito.`);
    
    // Actualizar la vista del carrito si está abierta
    if (this.showCart && this.cartComponent) {
      this.cartComponent.items = this.cartService.getCart();
  this.cartComponent.total = this.cartComponent.items.reduce((acc, item) => acc + item.product.precio * item.quantity, 0);
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

  isModalOpen = false;
  selectedProduct: any | null = null;


  openProductModal = (product: any): void => {
    this.selectedProduct = product;
    this.isModalOpen = true;
    document.body.style.overflow = 'hidden';
    const chatScroll = document.querySelector('.flex-grow.min-h-0.bg-base-100');
    if (chatScroll) chatScroll.classList.add('overflow-hidden');
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedProduct = null;
    document.body.style.overflow = '';
    const chatScroll = document.querySelector('.flex-grow.min-h-0.bg-base-100');
    if (chatScroll) chatScroll.classList.remove('overflow-hidden');
  }

  onConfirmAddToCart(event: { product: any, quantity: number }): void {
    this.onAddToQuote({ producto: event.product, cantidad: event.quantity });
    this.closeModal();
  }

  toggleCart(): void {
    this.showCart = !this.showCart;
    this.animateCartIcon = false;
  }

  openCotizacionModal(productosHtml: string) {
    this.productosHtml = productosHtml;
    this.showCotizacionModal = true;
  }


  closeCotizacionModal(cancelado: boolean = false) {
    this.showCotizacionModal = false;
    this.productosHtml = '';
    if (cancelado) {
      this.messages.push(this.buildMsg('Formulario cancelado por el usuario.', 'bot'));
      this.shouldScrollToBottom = true;
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
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnInit(): void {
    this.loadHistory();
    this.updateCartCount(); // Para tener el número inicial correcto

    // Nos suscribimos a las actualizaciones del carrito
    this.cartUpdateSubscription = this.cartService.cartUpdate$.subscribe(update => {
      this.updateCartCount();
      // ¡Esta es la parte que faltaba!
      // Activar la animación solo cuando se agrega un producto.
      if (update.type === 'add') {
        this.triggerAnimation();
      }
    });
  }

  ngAfterViewInit(): void {}

  handleCotizar(): void {
    this.showCart = false; // Cierra el carrito al cotizar
    this.addMessage('Quiero cotizar los productos que tengo en mi carrito.');
  }

  addMessage(userText: string): void {
    if (userText.includes('[FORMULARIO-ENVIADO]')) {
      // Mostrar solo 'Mensaje Enviado' en el chat para el usuario y NO mostrar el JSON
      this.messages.push(this.buildMsg('Mensaje Enviado', 'user'));
      this.isLoadingBotResponse = true;
    } else if (userText.includes('[ABRIR_FORMULARIO_COTIZACION]')) {
      // Mostrar un mensaje natural relacionado al carrito
      this.messages.push(this.buildMsg('Quiero cotizar los productos que tengo en mi carrito.', 'user'));
      this.isLoadingBotResponse = true;
    } else {
      this.messages.push(this.buildMsg(userText, 'user'));
      this.isLoadingBotResponse = true;
    }
    this.shouldScrollToBottom = true;

    const payload: AskPayload = { query: userText, session_id: this.sessionId };

    this.chat.askToBot(payload).subscribe({
      next: res => {
        if (res.response) {
          const safeResponse = res.response || '';

          // Detectar [AGREGAR_CARRITO] y extraer productos
          if (safeResponse.includes('[AGREGAR_CARRITO]')) {
            this.cartService.processAgregarCarritoMessage(safeResponse);
            this.messages.push(this.buildMsg('¡Listo! Los productos han sido agregados a tu carrito. Puedes revisarlos y cotizar cuando lo desees. 🛒', 'bot'));
          } else if (safeResponse.includes('[ELIMINAR_DEL_CARRITO]')) {
            // Espera formato: [ELIMINAR_DEL_CARRITO]CODIGO_PRODUCTO
            const match = safeResponse.match(/\[ELIMINAR_DEL_CARRITO\](\S+)/);
            if (match && match[1]) {
              this.cartService.removeProduct(match[1]);
              this.messages.push(this.buildMsg('Producto eliminado del carrito correctamente.', 'bot'));
            }
          } else if (safeResponse.includes('[VACIAR_CARRITO]')) {
            this.cartService.clearCart();
            this.messages.push(this.buildMsg('Todos los productos han sido eliminados del carrito.', 'bot'));
          } else if (safeResponse.includes('[ABRIR_FORMULARIO_COTIZACION]')) {
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
          } else {
            this.messages.push(this.buildMsg(res.response, 'bot', true));
          }
        } else {
          this.messages.push(this.buildMsg('No se recibió respuesta del bot.', 'bot'));
        }
        this.isLoadingBotResponse = false;
        this.shouldScrollToBottom = true;
      },
      error: err => {
        console.error(err);
        this.messages.push(this.buildMsg('Error al obtener respuesta del bot.', 'bot'));
        this.isLoadingBotResponse = false;
        this.shouldScrollToBottom = true;
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
        this.shouldScrollToBottom = true;
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

  onCategorySelected(category: any): void {
    const userMessage = `Quisiera ver los productos de la categoría '${category.nombre}'`;
    this.addMessage(userMessage);
  }

  updateCartCount(): void {
    this.cartItemCount = this.cartService.getUniqueItemCount();
  }

  triggerAnimation(): void {
    this.animateCartIcon = true;
    setTimeout(() => {
      this.animateCartIcon = false;
    }, 500);
  }

  ngOnDestroy(): void {
    if (this.cartUpdateSubscription) {
      this.cartUpdateSubscription.unsubscribe();
    }
  }

}
