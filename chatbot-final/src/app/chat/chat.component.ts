import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputChatComponent } from '../input-chat/input-chat.component';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, InputChatComponent],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent {
  newMessage: string = '';
  isLoadingBotResponse: boolean = false;
  messages: Message[] = [
  ];

  addMessage(message: string): void {
    this.messages.push({
      text: message,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    });

    this.isLoadingBotResponse = true;

    setTimeout(() => {
      this.messages.push({
        text: 'Gracias por tu mensaje. Estoy aquí para ayudarte.',
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      });
      this.isLoadingBotResponse = false;
    }, 3000);
  }
}
