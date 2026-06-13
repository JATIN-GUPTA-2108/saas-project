import { useAuthStore } from '@/stores/auth-store';

export function useAuthCtx() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const organizationId = useAuthStore((s) => s.activeOrganization?.id);

  if (!accessToken || !organizationId) {
    return null;
  }

  return { token: accessToken, organizationId };
}
import { useAuthStore } from '@/stores/auth-store';

export function useAuthCtx() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const activeOrganization = useAuthStore((s) => s.activeOrganization);

  if (!accessToken || !activeOrganization) {
    return null;
  }

  return {
    token: accessToken,
    organizationId: activeOrganization.id,
    orgId: activeOrganization.id,
    role: activeOrganization.role,
  };
}