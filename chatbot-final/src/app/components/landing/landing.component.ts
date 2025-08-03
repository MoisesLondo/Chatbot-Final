import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingComponent {
  protected readonly ctaClicked = signal(false);

  constructor(private router: Router) {}

  goToChatbot() {
    this.ctaClicked.set(true);
    window.open('/chat', '_blank');
  }
}
