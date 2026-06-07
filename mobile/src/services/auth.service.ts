import { ApiClients } from './api.service';
import { StorageService, StorageKeys } from './storage.service';

export interface LoginRequest { email: string; password: string; }
export interface RegisterRequest {
  fullName: string; companyName: string;
  email: string; password: string;
}
export interface UserProfile {
  id: string; tenantId: string; email: string;
  fullName: string; roles: string[];
}

export const AuthService = {
  async login(req: LoginRequest) {
    const res = await ApiClients.identity.post('/api/v1/auth/login', req);
    if (res.data?.success && res.data?.data) {
      const { accessToken, refreshToken, user } = res.data.data;
      StorageService.set(StorageKeys.ACCESS_TOKEN,  accessToken);
      StorageService.set(StorageKeys.REFRESH_TOKEN, refreshToken);
      StorageService.set(StorageKeys.USER, JSON.stringify(user));
      return user as UserProfile;
    }
    throw new Error(res.data?.error || 'Login failed');
  },

  async register(req: RegisterRequest) {
    const res = await ApiClients.identity.post('/api/v1/auth/register', req);
    if (res.data?.success && res.data?.data) {
      const { accessToken, refreshToken, user } = res.data.data;
      StorageService.set(StorageKeys.ACCESS_TOKEN,  accessToken);
      StorageService.set(StorageKeys.REFRESH_TOKEN, refreshToken);
      StorageService.set(StorageKeys.USER, JSON.stringify(user));
      return user as UserProfile;
    }
    throw new Error(res.data?.error || 'Registration failed');
  },

  logout() {
    const rt = StorageService.get(StorageKeys.REFRESH_TOKEN);
    if (rt) {
      ApiClients.identity.post('/api/v1/auth/revoke', { refreshToken: rt })
        .catch(() => {});
    }
    StorageService.delete(StorageKeys.ACCESS_TOKEN);
    StorageService.delete(StorageKeys.REFRESH_TOKEN);
    StorageService.delete(StorageKeys.USER);
  },

  getCurrentUser(): UserProfile | null {
    const raw = StorageService.get(StorageKeys.USER);
    return raw ? JSON.parse(raw) : null;
  },

  isLoggedIn(): boolean {
    return StorageService.contains(StorageKeys.ACCESS_TOKEN);
  },
};
