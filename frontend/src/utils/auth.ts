export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export function getCurrentUser(): AuthUser | null {
  const raw = localStorage.getItem('auth_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function isAdmin(): boolean {
  return getCurrentUser()?.role === 'ADMIN';
}
