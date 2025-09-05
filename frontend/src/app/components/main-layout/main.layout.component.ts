import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterModule, RouterOutlet, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  protected userName = '';
  protected userRole = '';
  public readonly authService = inject(AuthService);
  public readonly loadingService = inject(LoadingService);
  private readonly router = inject(Router);

  constructor() {
    this.router.events.pipe(
      filter(event =>
        event instanceof NavigationStart ||
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      )
    ).subscribe(event => {
      if (event instanceof NavigationStart) {
        this.loadingService.show();
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.loadingService.hide();
      }
    });
  }

  ngOnInit(): void {
    const user = this.authService.getUserData();
    if (user) {
      this.userName = user.sub;  
      this.userRole = user.role;  
    } else {
      this.router.navigate(['/login']);
    }

  }

}