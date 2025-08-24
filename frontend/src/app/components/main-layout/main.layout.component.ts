import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent {
  protected userName = '';
  protected userRole = '';
  constructor(private router: Router, public authService: AuthService) {}

  ngOnInit(): void {
    const user = this.authService.getUserData();
    if (user) {
      this.userName = user.sub.charAt(0).toUpperCase() + user.sub.slice(1);   
      this.userRole = user.role;  
    } else {
      this.router.navigate(['/login']);
    }

  }

}