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
  @Output() messageSent = new EventEmitter<string>();

  message: string = '';
  disabled: boolean = false;

  handleSend(): void {
    if (this.message.trim() === '' || this.disabled) return;

    this.messageSent.emit(this.message); // Emitir el mensaje
    this.message = ''; 
  }

  handleKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.handleSend();
    }
  }
}

