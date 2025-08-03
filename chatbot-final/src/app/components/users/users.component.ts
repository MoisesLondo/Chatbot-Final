import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface VendedorProfile {
  id?: number;
  full_name: string;
  email: string;
  tel: string;
}

interface AuthUser {
  id: string;
  username: string;
  password?: string;
  password_hash?: string;
  role: 'admin' | 'vendedor';
  is_active: boolean;
  created_at: string;
  profile?: VendedorProfile;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  salesUsers: number;
}

interface CreateUserRequest {
  username: string;
  password: string;
  role: 'admin' | 'vendedor';
  is_active: boolean;
  profile: {
    full_name: string;
    email: string;
    tel: string;
  };
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule, DatePipe],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersComponent implements OnInit {
  private readonly http = inject(HttpClient);

  // Signals
  protected readonly users = signal<AuthUser[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showUserModal = signal(false);
  protected readonly showViewModal = signal(false);
  protected readonly isEditMode = signal(false);
  protected readonly selectedUser = signal<AuthUser | null>(null);

  // Filters
  protected readonly searchTermSignal = signal('');
  protected readonly roleFilterSignal = signal('');
  protected readonly statusFilterSignal = signal('');

  // Current user for create/edit
  protected currentUser: AuthUser = this.getEmptyUser();

  // Computed values
  protected readonly stats = computed<UserStats>(() => {
    const userList = this.users();
    return {
      totalUsers: userList.length,
      activeUsers: userList.filter(u => u.is_active).length,
      inactiveUsers: userList.filter(u => !u.is_active).length,
      salesUsers: userList.filter(u => u.role === 'vendedor').length,
    };
  });

  protected readonly filteredUsers = computed(() => {
    let filtered = this.users();
    
    // Search filter
    const search = this.searchTermSignal().toLowerCase();
    if (search) {
      filtered = filtered.filter(user => 
        user.username.toLowerCase().includes(search) ||
        user.profile?.full_name?.toLowerCase().includes(search) ||
        user.profile?.email?.toLowerCase().includes(search)
      );
    }

    // Role filter
    const role = this.roleFilterSignal();
    if (role) {
      filtered = filtered.filter(user => user.role === role);
    }

    // Status filter
    const status = this.statusFilterSignal();
    if (status !== '') {
      filtered = filtered.filter(user => user.is_active === (status === 'true'));
    }

    return filtered;
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  private getEmptyUser(): AuthUser {
    return {
      id: '',
      username: '',
      password: '',
      role: 'vendedor',
      is_active: true,
      created_at: new Date().toISOString(),
      profile: {
        full_name: 'Nombre Dummy',
        email: 'dummy@example.com',
        tel: '1234567890'
      }
    };
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.error.set(null);

    // Simular llamada a API - reemplaza con tu endpoint real
    this.http.get<AuthUser[]>('http://127.0.0.1:8000/users').subscribe({
      next: (users) => {
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.error.set('Error al cargar los usuarios');
        this.isLoading.set(false);
        
        // Datos de ejemplo para desarrollo
        this.loadMockData();
      },
    });
  }

  private loadMockData(): void {
    const mockUsers: AuthUser[] = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        username: 'admin',
        role: 'admin',
        is_active: true,
        created_at: '2024-01-15T10:30:00Z',
        profile: {
          id: 1,
          full_name: 'Administrador Principal',
          email: 'admin@mhierro.com',
          tel: '+52 55 1234-5678'
        }
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        username: 'carlos.mendoza',
        role: 'vendedor',
        is_active: true,
        created_at: '2024-01-10T09:15:00Z',
        profile: {
          id: 2,
          full_name: 'Carlos Mendoza',
          email: 'carlos@mhierro.com',
          tel: '+52 55 9876-5432'
        }
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        username: 'ana.garcia',
        role: 'vendedor',
        is_active: true,
        created_at: '2024-01-08T14:20:00Z',
        profile: {
          id: 3,
          full_name: 'Ana García',
          email: 'ana@mhierro.com',
          tel: '+52 55 5555-1234'
        }
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        username: 'roberto.silva',
        role: 'vendedor',
        is_active: false,
        created_at: '2024-01-05T11:45:00Z',
        profile: {
          id: 4,
          full_name: 'Roberto Silva',
          email: 'roberto@mhierro.com',
          tel: '+52 55 7777-8888'
        }
      }
    ];
    
    this.users.set(mockUsers);
    this.isLoading.set(false);
  }

  filterUsers(): void {
    // Los filtros se aplican automáticamente a través del computed
  }

  clearFilters(): void {
    this.searchTermSignal.set('');
    this.roleFilterSignal.set('');
    this.statusFilterSignal.set('');
  }

  openCreateUserModal(): void {
    this.currentUser = this.getEmptyUser();
    this.isEditMode.set(false);
    this.showUserModal.set(true);
  }

  editUser(user: AuthUser): void {
    this.currentUser = { 
      ...user, 
      profile: {
        id: user.profile?.id,
        full_name: user.profile?.full_name ?? '',
        email: user.profile?.email ?? '',
        tel: user.profile?.tel ?? ''
      }
    };
    this.isEditMode.set(true);
    this.showUserModal.set(true);
  }

  closeUserModal(): void {
    this.showUserModal.set(false);
    this.currentUser = this.getEmptyUser();
  }

  viewUser(user: AuthUser): void {
    this.selectedUser.set(user);
    this.showViewModal.set(true);
  }

  closeViewModal(): void {
    this.showViewModal.set(false);
    this.selectedUser.set(null);
  }

  editUserFromView(): void {
    const user = this.selectedUser();
    if (user) {
      this.closeViewModal();
      this.editUser(user);
    }
  }

  saveUser(): void {
    this.isLoading.set(true);

    if (this.isEditMode()) {
      // Update user
      this.http.put(`http://127.0.0.1:8000/users/${this.currentUser.id}`, this.currentUser).subscribe({
        next: (updatedUser: any) => {
          const users = this.users();
          const index = users.findIndex(u => u.id === this.currentUser.id);
          if (index !== -1) {
            users[index] = updatedUser;
            this.users.set([...users]);
          }
          this.closeUserModal();
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error updating user:', err);
          this.error.set('Error al actualizar el usuario');
          this.isLoading.set(false);
          
          // Simular actualización exitosa para desarrollo
          this.simulateUserUpdate();
        },
      });
    } else {
      // Create user
      const createRequest: CreateUserRequest = {
        username: this.currentUser.username,
        password: this.currentUser.password || '',
        role: this.currentUser.role,
        is_active: this.currentUser.is_active,
        profile: this.currentUser.profile || { full_name: '', email: '', tel: '' }
      };

      this.http.post<AuthUser>('http://127.0.0.1:8000/users', createRequest).subscribe({
        next: (newUser) => {
          this.users.set([...this.users(), newUser]);
          this.closeUserModal();
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Error creating user:', err);
          this.error.set('Error al crear el usuario');
          this.isLoading.set(false);
          
          // Simular creación exitosa para desarrollo
          this.simulateUserCreation();
        },
      });
    }
  }

  private simulateUserUpdate(): void {
    const users = this.users();
    const index = users.findIndex(u => u.id === this.currentUser.id);
    if (index !== -1) {
      users[index] = { ...this.currentUser };
      this.users.set([...users]);
    }
    this.closeUserModal();
    this.isLoading.set(false);
  }

  private simulateUserCreation(): void {
    const newUser: AuthUser = {
      ...this.currentUser,
      id: `550e8400-e29b-41d4-a716-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    delete newUser.password; // Remove password from stored user
    
    this.users.set([...this.users(), newUser]);
    this.closeUserModal();
    this.isLoading.set(false);
  }

  toggleUserStatus(user: AuthUser): void {
    const newStatus = !user.is_active;
    
    this.http.patch(`http://127.0.0.1:8000/users/${user.id}/status`, { is_active: newStatus }).subscribe({
      next: () => {
        const users = this.users();
        const index = users.findIndex(u => u.id === user.id);
        if (index !== -1) {
          users[index].is_active = newStatus;
          this.users.set([...users]);
        }
      },
      error: (err) => {
        console.error('Error toggling user status:', err);
        this.error.set('Error al cambiar el estado del usuario');
        
        // Simular cambio exitoso para desarrollo
        const users = this.users();
        const index = users.findIndex(u => u.id === user.id);
        if (index !== -1) {
          users[index].is_active = newStatus;
          this.users.set([...users]);
        }
      },
    });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  // Getters para template binding
  get searchTerm() { return this.searchTermSignal.asReadonly(); }
  get roleFilter() { return this.roleFilterSignal.asReadonly(); }
  get statusFilter() { return this.statusFilterSignal.asReadonly(); }
}