import { apiRequest } from '@/lib/api';
import type {
  LoginResponse,
  RegisterResponse,
  User,
} from '@/types/auth';

export async function login(email: string, password: string) {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function register(payload: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
}) {
  return apiRequest<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: payload,
  });
}

export async function fetchMe(token: string) {
  return apiRequest<User>('/auth/me', { token });
}
