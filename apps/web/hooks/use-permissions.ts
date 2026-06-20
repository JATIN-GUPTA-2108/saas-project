import { useQuery } from "@tanstack/react-query";
import { fetchPermissions } from "@/services/rbac.service";
import { useAuthCtx } from "./use-auth-ctx";

export function usePermissions() {
  const ctx = useAuthCtx();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ["permissions", ctx?.orgId],
    queryFn: () => fetchPermissions(ctx!),
    enabled: !!ctx,
  });

  const has = (permission: string) => permissions.includes(permission);

  return { permissions, has, isLoading };
}
