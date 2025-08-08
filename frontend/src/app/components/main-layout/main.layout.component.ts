import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  protected userName = 'Carlos Mendoza';
  protected userRole = 'admin';
  constructor(private router: Router) {}

  logout(): void {
    localStorage.removeItem('auth_token');
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }
}