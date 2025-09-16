import { AuthService } from '../../services/auth.service';

export function getCurrentUserRole(): string | null {
  const authService = new AuthService(null as any, null as any);
  const user = authService.getUserData();
  return user?.role || null;
}
