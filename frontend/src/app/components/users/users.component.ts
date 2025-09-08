import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

interface VendedorProfile {
  id?: number;
  full_name: string;
  email: string;
  tel: string;
}

export interface AuthUser {
  id: string;
  username: string;
  password?: string;
  password_hash?: string;
  role: 'admin' | 'vendedor';
  is_active: boolean;
  created_at: string;
  profile: VendedorProfile;
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
export class UsersComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  // Signals
  protected readonly users = signal<AuthUser[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showUserModal = signal(false);
  protected readonly showViewModal = signal(false);
  protected readonly isEditMode = signal(false);
  protected readonly selectedUser = signal<AuthUser | null>(null);
  loadingStatusMap: { [userId: string]: boolean } = {};

  constructor() {
    this.route.data.subscribe(({ users }) => {
      this.users.set(users);
    });
  }


  
  // Filters
  protected readonly searchTermSignal = signal('');
  protected readonly roleFilterSignal = signal('');
  protected readonly statusFilterSignal = signal('');

  // Campos auxiliares para el formulario de usuario
  confirmPassword = '';
  codigoTelefono = '0424';
  telefono = '';
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


  refreshUsers(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.http.get<AuthUser[]>('http://127.0.0.1:8000/users').subscribe({
      next: (users) => {
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error refreshing users:', err);
        this.error.set('Error al cargar los usuarios');
        this.isLoading.set(false);
      },
    });
  }
  
  // ngOnInit(): void {
  //   this.loadUsers();
  // }

  private getEmptyUser(): AuthUser {
    return {
      id: '',
      username: '',
      password: '',
      role: 'vendedor',
      is_active: true,
      created_at: new Date().toISOString(),
      profile: {
        full_name: '',
        email: '',
        tel: '0412 000-0000'
      }
    };
  }

  // loadUsers(): void {
  //   this.isLoading.set(true);
  //   this.error.set(null);

  //   // Simular llamada a API - reemplaza con tu endpoint real
  //   this.http.get<AuthUser[]>('http://127.0.0.1:8000/users').subscribe({
  //     next: (users) => {
  //       this.users.set(users);
  //       this.isLoading.set(false);
  //     },
  //     error: (err) => {
  //       console.error('Error loading users:', err);
  //       this.error.set('Error al cargar los usuarios');
  //       this.isLoading.set(false);
  //     },
  //   });
  // }

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
  this.confirmPassword = '';
  this.codigoTelefono = '0424';
  this.telefono = '';
  this.isEditMode.set(false);
  this.error.set(null);
  this.isLoading.set(false);
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
    this.confirmPassword = '';
    // Separar el teléfono en código y número
    if (this.currentUser.profile && this.currentUser.profile.tel) {
      const match = this.currentUser.profile.tel.match(/^(04\d{2})-(\d{7})$/);
      if (match) {
        this.codigoTelefono = match[1];
        this.telefono = match[2];
      } else {
        this.codigoTelefono = '0424';
        this.telefono = '';
      }
    } else {
      this.codigoTelefono = '0424';
      this.telefono = '';
    }
    this.isEditMode.set(true);
    this.showUserModal.set(true);
  }

closeUserModal(userForm?: any): void {
  this.error.set(null);
  this.isLoading.set(false);
  this.currentUser = this.getEmptyUser();
  this.confirmPassword = '';
  this.codigoTelefono = '0424';
  this.telefono = '';

  console.log('userForm at close:', userForm);
  if (userForm && userForm.form) {
    userForm.resetForm(this.getEmptyUser());
    Object.values(userForm.controls).forEach(control => {
      const formControl = control as import('@angular/forms').AbstractControl;
      formControl.markAsPristine();
      formControl.markAsUntouched();
      formControl.setErrors(null); 
    });
  }

  this.showUserModal.set(false);
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
    if (!this.isEditMode() && this.currentUser.password !== this.confirmPassword) {
      this.error.set('Las contraseñas no coinciden');
      return;
    }
    // Concatenar el teléfono
    if (this.currentUser.profile) {
      this.currentUser.profile.tel = this.codigoTelefono && this.telefono ? `${this.codigoTelefono}-${this.telefono}` : '';
    }
    this.isLoading.set(true);

    if (this.isEditMode()) {
  const updatePayload: Partial<AuthUser> = { ...this.currentUser };

  // Si el admin no ingresó nueva contraseña, eliminarla para no sobrescribir
  if (!this.currentUser.password) {
    delete updatePayload.password;
  }

  this.http.put(`http://127.0.0.1:8000/users/${this.currentUser.id}`, updatePayload).subscribe({
    next: (updatedUser: any) => {
      const users = this.users();
          const index = users.findIndex(u => u.id === this.currentUser.id);
          if (index !== -1) {
            users[index] = {
              ...updatedUser,
              profile: {
                full_name: updatedUser.profile.full_name || '',
                email: updatedUser.profile.email || '',
                tel: updatedUser.profile.tel || ''
              }
            };
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
          // this.simulateUserUpdate();
    },
  });
    } else {
      // Create user
      const createRequest: CreateUserRequest = {
        username: this.currentUser.username,
        password: this.currentUser.password || '',
        role: this.currentUser.role,
        is_active: true,
        profile: this.currentUser.profile || { full_name: '', email: '', tel: '' }
      };

      this.http.post<AuthUser>('http://127.0.0.1:8000/register-vendedor', createRequest).subscribe({
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
          // this.simulateUserCreation();
        },
      });
    }
  }

toggleUserStatus(user: AuthUser): void {
  this.loadingStatusMap[user.id] = true; // empezar loader
  
  const newStatus = !user.is_active;
  
  this.http.patch(`http://127.0.0.1:8000/users/${user.id}/status`, { is_active: newStatus }).subscribe({
    next: () => {
      const users = this.users();
      const index = users.findIndex(u => u.id === user.id);
      if (index !== -1) {
        users[index].is_active = newStatus;
        this.users.set([...users]);
      }
      this.loadingStatusMap[user.id] = false; // terminar loader
    },
    error: (err) => {
      console.error('Error toggling user status:', err);
      this.error.set('Error al cambiar el estado del usuario');
      this.loadingStatusMap[user.id] = false; // terminar loader
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