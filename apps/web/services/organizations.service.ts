import { apiRequest } from '@/lib/api';
import type { Organization } from '@/types/auth';
import type { OrganizationMember } from '@/types/organization';

type AuthCtx = { token: string; organizationId: string };

export async function fetchOrganizations(token: string) {
  return apiRequest<Organization[]>('/organizations', { token });
}

export async function createOrganization(
  token: string,
  body: { name: string },
) {
  return apiRequest<Organization>('/organizations', {
    token,
    method: 'POST',
    body,
  });
}

export async function fetchOrganization(token: string, organizationId: string) {
  return apiRequest<Organization>(`/organizations/${organizationId}`, { token });
}

export async function fetchMembers(ctx: AuthCtx, organizationId: string) {
  return apiRequest<OrganizationMember[]>(
    `/organizations/${organizationId}/members`,
    ctx,
  );
}

export async function inviteMember(
  ctx: AuthCtx,
  organizationId: string,
  body: { email: string; roleSlug: string },
) {
  return apiRequest<OrganizationMember>(
    `/organizations/${organizationId}/members`,
    { ...ctx, method: 'POST', body },
  );
}
