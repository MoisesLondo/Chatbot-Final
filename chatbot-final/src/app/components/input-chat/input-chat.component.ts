import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'

@Component({
  selector: 'app-input-chat',
  standalone: true,
  imports: [ FormsModule, CommonModule ],
  templateUrl: './input-chat.component.html',
  styleUrl: './input-chat.component.css'
})
export class InputChatComponent {
  @Output() resetChat = new EventEmitter<void>();
  // ...existing code...
  resetChatHistory(): void {
    this.resetChat.emit();
  }
  @Output() messageSent = new EventEmitter<string>();

  message: string = '';
  disabled: boolean = false;

  handleSend(): void {
    if (this.message.trim() === '' || this.disabled) return;

    this.messageSent.emit(this.message); // Emitir el mensaje
    this.message = ''; 
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.handleSend();
    }
    // Shift+Space: permite espacio normal, no hace nada especial
    // Shift+Enter: permite salto de línea
  }

  autoGrow(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.height = 'auto';
      const lineHeight = 24; // px, ajusta si tu textarea usa otro tamaño
      const maxLines = 6;
      const maxHeight = lineHeight * maxLines;
      textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
    }
  }
}

