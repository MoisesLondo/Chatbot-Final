import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputChatComponent } from '../input-chat/input-chat.component';
import { AskPayload, HistoryEntry } from '../models';
import { ChatService } from '../services';


interface Message {
  text: string;
  sender: 'user' | 'bot';
  // timestamp: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, InputChatComponent],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, AfterViewInit {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  isLoadingBotResponse: boolean = false;
  messages: Message[] = [];
  private sessionId: string

  constructor(private chat: ChatService, private cdr: ChangeDetectorRef) {

    this.sessionId = localStorage.getItem('session_id') ?? crypto.randomUUID();
    localStorage.setItem('session_id', this.sessionId);
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
        this.messages.push(this.buildMsg(res.content, 'bot'));
        setTimeout(() => this.scrollToBottom(), 0);
        this.isLoadingBotResponse = false;

        this.loadHistory();
      },
      error: err => {
        console.error(err);
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
    return this.buildMsg(e.content, sender);
  };

  private buildMsg(text: string, sender: 'user' | 'bot'): Message {
    return {
      text,
      sender
      // timestamp: new Date().toLocaleTimeString('es-ES', {
      //   hour: '2-digit',
      //   minute: '2-digit'
      // })
    };
  }

  private scrollToBottom(): void {
    try {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }
}
