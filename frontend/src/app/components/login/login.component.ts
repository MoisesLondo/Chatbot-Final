import { ChangeDetectionStrategy, Component, signal, ChangeDetectorRef  } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

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
  protected readonly isLoading = signal(false);
  errorMessage: string | null = null;

  constructor(private router: Router, private authService: AuthService, private cdr: ChangeDetectorRef) {}

  login() {
    this.isLoading.set(true);
    this.authService.login(this.username, this.password).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res) {
          this.errorMessage = null;
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage = err.message;
        this.cdr.detectChanges();
      }
    });
  }

  loginError() {
    return this.error();
  }

  isLoadingFn() {
    return this.isLoading();
  }
}
