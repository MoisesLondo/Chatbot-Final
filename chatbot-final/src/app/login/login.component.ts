import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  protected username = '';
  protected password = '';
  protected readonly error = signal(false);

  constructor(private router: Router) {}

  login() {
    // Demo: usuario: admin, contraseña: 1234
    if (this.username === 'admin' && this.password === '1234') {
      this.error.set(false);
      this.router.navigate(['/']);
    } else {
      this.error.set(true);
    }
  }

  loginError() {
    return this.error();
  }
}
