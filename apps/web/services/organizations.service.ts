import { apiRequest } from '@/lib/api';
import type { Organization } from '@/types/auth';

export async function fetchOrganizations(token: string) {
  return apiRequest<Organization[]>('/organizations', { token });
}
