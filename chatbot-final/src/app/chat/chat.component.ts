import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef} from '@angular/core';
import { CotizacionModalComponent } from '../cotizacion-modal/cotizacion-modal.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputChatComponent } from '../input-chat/input-chat.component';
import { AskPayload, HistoryEntry } from '../models';
import { ChatService } from '../services';
import { MarkdownModule } from 'ngx-markdown';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  // timestamp: string;
  htmlText?: string; // para mostrar saltos de línea
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputChatComponent,
    CotizacionModalComponent,
    MarkdownModule
  ],
  
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, AfterViewInit {
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
  }
  private sessionId: string

  constructor(private chat: ChatService, private cdr: ChangeDetectorRef) {
    this.sessionId = sessionStorage.getItem('session_id') ?? crypto.randomUUID();
    sessionStorage.setItem('session_id', this.sessionId);
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
          if (safeResponse.includes('[ABRIR_FORMULARIO_COTIZACION]')) {
            const match = safeResponse.match(/\[ABRIR_FORMULARIO_COTIZACION\]([\s\S]*)/i);
            const productosHtml = match ? match[1].trim() : '';
            this.messages.push(this.buildMsg('Por favor, completa el formulario de cotización.', 'bot'));
            this.openCotizacionModal(productosHtml);
            this.scrollToBottom();
            this.isLoadingBotResponse = false;
            return;
          }
          this.messages.push(this.buildMsg(res.response, 'bot', true));
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

  private historyEntryToMsg = (e: HistoryEntry): Message => {
    const sender = e.type === 'human' ? 'user' : 'bot';
    if (sender === 'user' && e.content.includes('[FORMULARIO-ENVIADO]')) {
      return this.buildMsg('Mensaje Enviado', 'user');
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
