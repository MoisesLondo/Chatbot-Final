import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

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

  constructor(private router: Router, private authService: AuthService) {}

  login() {
    this.authService.login(this.username, this.password).subscribe((res) => {
      if (res) {
        this.error.set(false);
        this.router.navigate(['/dashboard']); // o ruta protegida
      } else {
        this.error.set(true);
      }
    });
  }

  loginError() {
    return this.error();
  }
}
