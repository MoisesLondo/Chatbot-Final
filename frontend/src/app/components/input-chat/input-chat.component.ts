import { Component, EventEmitter, Output, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-input-chat',
  standalone: true,
  imports: [ FormsModule, CommonModule ],
  templateUrl: './input-chat.component.html',
  styleUrl: './input-chat.component.css'
})
export class InputChatComponent {
  @ViewChild('chatInput') chatInput!: ElementRef<HTMLTextAreaElement>;

  @Output() resetChat = new EventEmitter<void>();
  @Output() messageSent = new EventEmitter<string>();

  message: string = '';
  disabled: boolean = false;

  resetChatHistory(): void {
    this.resetChat.emit();
  }

  handleSend(): void {
    if (this.message.trim() === '' || this.disabled) return;

    this.messageSent.emit(this.message);
    this.message = '';
    
    setTimeout(() => this.autoGrow(), 0);
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.handleSend();
    }
  }

  autoGrow(): void {
    const textarea = this.chatInput.nativeElement;
    if (textarea) {
      textarea.style.height = 'auto';

      // Define la altura máxima en píxeles. 80px son aprox. 3-4 líneas.
      const maxHeight = 80; 

      const scrollHeight = textarea.scrollHeight;

      // Aplica la altura, sin superar nunca el máximo definido.
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }
}