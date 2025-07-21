import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef} from '@angular/core';
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
    MarkdownModule // Add MarkdownModule here
  ],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, AfterViewInit {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  isLoadingBotResponse: boolean = false;
  messages: Message[] = [];
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
  this.messages.push(this.buildMsg(userText, 'user'));
  this.isLoadingBotResponse = true;
  setTimeout(() => this.scrollToBottom(), 0);

  const payload: AskPayload = { query: userText, session_id: this.sessionId };

  this.chat.askToBot(payload).subscribe({
  next: res => {
    console.log('Respuesta del backend:', res); // <-- Agrega esto
    if (res.response) {
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
}