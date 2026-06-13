'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { fetchOrganizations } from '@/services/organizations.service';
import { useAuthStore } from '@/stores/auth-store';

export function OrgSwitcher() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const activeOrganization = useAuthStore((s) => s.activeOrganization);
  const setActiveOrganization = useAuthStore((s) => s.setActiveOrganization);

  const { data: organizations } = useQuery({
    queryKey: ['organizations', accessToken],
    queryFn: () => fetchOrganizations(accessToken!),
    enabled: !!accessToken,
  });

  useEffect(() => {
    if (organizations?.length && !activeOrganization) {
      setActiveOrganization(organizations[0]);
    }
  }, [organizations, activeOrganization, setActiveOrganization]);

  if (!organizations?.length) {
    return (
      <span className="text-xs text-zinc-500">No workspace</span>
    );
  }

  if (organizations.length === 1) {
    return (
      <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
        {organizations[0].name}
      </span>
    );
  }

  return (
    <select
      value={activeOrganization?.id ?? ''}
      onChange={(e) => {
        const org = organizations.find((o) => o.id === e.target.value);
        if (org) {
          setActiveOrganization(org);
          void queryClient.invalidateQueries();
        }
      }}
      className="rounded-full border-0 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-300 dark:bg-indigo-950 dark:text-indigo-300"
      aria-label="Switch workspace"
    >
      {organizations.map((org) => (
        <option key={org.id} value={org.id}>
          {org.name}
        </option>
      ))}
    </select>
  );
}
