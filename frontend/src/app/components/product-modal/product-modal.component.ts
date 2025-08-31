import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-product-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './product-modal.component.html',
  styleUrls: ['./product-modal.component.css']
})
export class ProductModalComponent implements OnChanges {
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']) {
      if (this.isOpen) {
        document.body.style.overflow = 'hidden';
        this.quantity = 1;
        this.error = '';
        setTimeout(() => {
          const modal = document.querySelector('.bg-white.rounded-lg.shadow-2xl');
          if (modal) {
            modal.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          const chatScroll = document.querySelector('.flex-grow.min-h-0.bg-base-100');
          if (chatScroll) chatScroll.classList.add('overflow-hidden');
        }, 50);
      } else {
        document.body.style.overflow = '';
        const chatScroll = document.querySelector('.flex-grow.min-h-0.bg-base-100');
        if (chatScroll) chatScroll.classList.remove('overflow-hidden');
      }
    }
  }
  @Input() product: any | null = null;
  @Input() isOpen: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<{ product: any, quantity: number }>();

  quantity: number = 1;
  error: string = '';


  onConfirm(): void {
    if (!this.product) return;

    if (this.quantity < 1) {
      this.error = 'La cantidad debe ser al menos 1.';
      return;
    }
    if (this.quantity > this.product.stock) {
      this.error = 'No hay suficiente stock disponible.';
      return;
    }
    this.confirm.emit({ product: this.product, quantity: this.quantity });
  }

  onClose(): void {
  document.body.style.overflow = '';
  this.close.emit();
  }
}
