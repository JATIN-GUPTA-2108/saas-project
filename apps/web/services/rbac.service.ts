import { apiRequest } from '@/lib/api';

type AuthCtx = { token: string; organizationId: string };

export async function fetchPermissions(ctx: AuthCtx) {
  return apiRequest<string[]>('/rbac/permissions', ctx);
}
