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
import { AuthService } from '../../services/auth.service';
import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';
 
interface Message {
  text: string;
  sender: 'user' | 'bot';
  htmlText?: string;
}

import { CartComponent } from '../cart/cart.component';
import { getUnit } from '../../lib/getUnit';

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
  private notificationSound = new Audio('/sounds/happy-message-ping-351298.mp3');
  private notyf = new Notyf();

  private sessionId: string;
  cartItemCount = 0;
  animateCartIcon = false;
  private cartUpdateSubscription: Subscription = new Subscription();
  private botErrorSubscription: Subscription = new Subscription();
  constructor(
    private chat: ChatService,
    private cartService: CartService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private auth: AuthService
  ) {
    this.sessionId = sessionStorage.getItem('session_id') ?? crypto.randomUUID();
    sessionStorage.setItem('session_id', this.sessionId);
  }

  isAdminOrSeller(): boolean {
    return this.auth.isAdminOrSeller();
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
    // Actualizar la vista del carrito si está abierta
    if (this.showCart && this.cartComponent) {
      this.cartComponent.items = this.cartService.getCart();
      if (typeof this.cartComponent.calcularTotales === 'function') {
        this.cartComponent.calcularTotales();
      }
    }
  }
  // Extrae el primer array JSON de productos de cualquier string
  extractVisualList(text: string): { items: any[], type: 'productos' | 'categorias' | null } {
    if (!text) return { items: [], type: null };
    // Busca todos los arrays JSON en el texto
    const matches = text.match(/\[\s*{[\s\S]*?}\s*\]/g);
    if (matches && matches.length > 0) {
      // Toma el último array JSON válido
      for (let i = matches.length - 1; i >= 0; i--) {
        try {
          const arr = JSON.parse(matches[i]);
          if (Array.isArray(arr) && arr.length > 0) {
            if (arr[0].nombre && (arr[0].precio !== undefined || arr[0].stock !== undefined)) {
              return { items: arr, type: 'productos' };
            } else if (arr[0].nombre && arr[0].precio === undefined && arr[0].stock === undefined) {
              return { items: arr, type: 'categorias' };
            }
          }
        } catch {}
      }
    }
    return { items: [], type: null };
  }
  // Extrae el <p> final de un mensaje del bot si existe
  // Extrae el último <p> de un mensaje del bot si existen varios
  extractTrailingP(text: string): string | null {
    const pMatches = text.match(/<p>[\s\S]*?<\/p>/g);
    if (pMatches && pMatches.length > 0) {
      return pMatches[pMatches.length - 1];
    }
    return null;
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
      this.messages.push(this.buildMsg('¡Vaya! Necesito que completes tus datos para generar tu cotización. Estaré aquí para cuando desees continuar 😊🙏.', 'bot'));
      this.shouldScrollToBottom = true;
    }
  }


  onCotizacionSubmit(data: any) {
    if (data && typeof data === 'object' && 'isTrusted' in data) {
      return;
    }
    // Obtener datos de vendedor si aplica
    let vendedor = null;
    if (this.isAdminOrSeller()) {
      const user = this.auth.getUserData();
      if (user) {
        vendedor = { id: user.user_id };
      }
    }
    const payload = { ...data, productosHtml: this.cartService.getCartItems() };
    if (vendedor) {
      payload.vendedor = vendedor;
    }
  
    const mensaje: string = `[FORMULARIO-ENVIADO]${JSON.stringify(payload, null, 2)}`;
    this.addMessage(mensaje);
    this.closeCotizacionModal(false);
    this.cartService.clearCart();
    if (this.showCart && this.cartComponent) {
              this.cartComponent.items = [];
              if (typeof this.cartComponent.calcularTotales === 'function') {
                this.cartComponent.calcularTotales();
              }
            }
            this.notyf.success({
              message: 'Cotización generada correctamente.',
              duration: 4000,
              dismissible: true,
              position: { x: 'right', y: 'top' }
            });
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
  enviarCotizacion() {
    // Suponiendo que aquí se arma el payload para la cotización
    const productosCotizar = this.cartService.getCart().map(item => ({
      qty: item.quantity,
      uPrice: item.product.precio,
      pCod: item.product.codigo,
      prodName: item.product.nombre,
      unit: getUnit(item.product.unidad, item.quantity)
    }));
    // ...aquí sigue el envío al backend...
  }

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
      // Solo permite abrir el formulario si el carrito NO está vacío
      if (this.cartService.getCart().length > 0) {
        this.messages.push(this.buildMsg('Quiero cotizar los productos que tengo en mi carrito.', 'user'));
        this.isLoadingBotResponse = true;
      } // Si el carrito está vacío, no hace nada
    } else {
      this.messages.push(this.buildMsg(userText, 'user'));
      this.isLoadingBotResponse = true;
    }
    this.shouldScrollToBottom = true;

    const payload: AskPayload = { query: userText, session_id: this.sessionId };

    this.chat.askToBot(payload).subscribe({
      next: res => {
        this.notificationSound.play().then(() => {
          console.log('Audio de notificación reproducido correctamente.');
        }).catch(error => {
          console.warn("La reproducción de audio fue bloqueada o falló: ", error);
        });
        if (res.response) {
          const safeResponse = res.response || '';

          if (safeResponse.includes('[AGREGAR_CARRITO]')) {
            this.cartService.processAgregarCarritoMessage(safeResponse);
            this.messages.push(this.buildMsg('¡Listo! Los productos han sido agregados a tu carrito. Si necesitas algo más, con gusto te ayudo.', 'bot'));
          } else if (safeResponse.includes('[ELIMINAR_DEL_CARRITO]')) {
            // Espera formato: [ELIMINAR_DEL_CARRITO]CODIGO_PRODUCTO
            const match = safeResponse.match(/\[ELIMINAR_DEL_CARRITO\](\S+)/);
            if (match && match[1]) {
              this.cartService.removeProduct(match[1]);
              this.messages.push(this.buildMsg('¡Listo! Producto eliminado de tu carrito correctamente. ¿Deseas agregar otro producto?', 'bot'));
            }
          } else if (safeResponse.includes('[VACIAR_CARRITO]')) {
            this.cartService.clearCart();
            if (this.showCart && this.cartComponent) {
              this.cartComponent.items = [];
              if (typeof this.cartComponent.calcularTotales === 'function') {
                this.cartComponent.calcularTotales();
              }
            }
            this.notyf.success({
              message: 'Carrito vaciado correctamente.',
              duration: 4000,
              dismissible: true,
              position: { x: 'right', y: 'top' }
            });
            this.messages.push(this.buildMsg('Todos los productos han sido eliminados de tu carrito. Si deseas agregar otros productos, házmelo saber.', 'bot'));
          } else if (safeResponse.includes('[ABRIR_FORMULARIO_COTIZACION]')) {
            // Construir productosHtml desde el carrito actual
            const cartProducts = this.cartService.getCartItems();
            let productosHtml = '';
            if (cartProducts && cartProducts.length > 0) {
              productosHtml = `<ul class=\"list-disc pl-4\">` +
                cartProducts.map((item: any) => {
                  const nombre = item.product?.nombre || '';
                  const cantidad = item.quantity || 1;
                  const codigo = item.product?.codigo || '';
                  const precio = item.product?.precio || 0;
                  return `<li>${nombre} (Cantidad: ${cantidad}, Código: ${codigo}, uPrice: ${precio})</li>`;
                }).join('') + `</ul>`;
              this.messages.push(this.buildMsg('Por favor, completa el formulario de cotización.', 'bot'));
              this.openCotizacionModal(productosHtml);
            } else {
              this.notyf.error({message:'Disculpa, no puedes abrir el formulario de cotización con el carrito vacío.',
                duration: 60000,
                dismissible: true,
                position: {
                  x: 'right',
                  y: 'top',
                }
              });
              
            }
            
          } else {
            this.messages.push(this.buildMsg(res.response, 'bot', true));
          }
        } else {
          this.messages.push(this.buildMsg('Disculpa, no puedo darte una respuesta en este momento, por favor inténtalo más tarde.', 'bot'));
        }
        this.isLoadingBotResponse = false;
        this.shouldScrollToBottom = true;
      },
      error: err => {
        console.error(err);
        this.messages.push(this.buildMsg('Disculpa, estoy teniendo problemas de señal, por favor comunícate más tarde.', 'bot'));
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
    if (sender === 'user' && e.content.includes('[ABRIR_FORMULARIO_COTIZACION]')) {
      return { text: '', sender };
    }
    if (sender === 'bot' && e.content.includes('[AGREGAR_CARRITO]')) {
      return this.buildMsg('¡Listo! Los productos han sido agregados a tu carrito. Si necesitas algo más, con gusto te ayudo.', 'bot');
    }
    if (sender === 'bot' && e.content.includes('[VACIAR_CARRITO]')) {
      return this.buildMsg('Todos los productos han sido eliminados de tu carrito. Si deseas agregar otros productos, házmelo saber.', 'bot');
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
  }

  ngOnDestroy(): void {
    if (this.cartUpdateSubscription) {
      this.cartUpdateSubscription.unsubscribe();
    }
    if (this.botErrorSubscription) {
      this.botErrorSubscription.unsubscribe();
    }
  }


}
