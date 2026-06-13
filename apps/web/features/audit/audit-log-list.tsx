'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAuditLogs } from '@/services/analytics.service';
import { useAuthStore } from '@/stores/auth-store';

export function AuditLogList() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const activeOrganization = useAuthStore((s) => s.activeOrganization);
  const ctx = {
    token: accessToken!,
    organizationId: activeOrganization!.id,
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs', activeOrganization?.id],
    queryFn: () => fetchAuditLogs(ctx),
    enabled: !!accessToken && !!activeOrganization,
  });

  if (!activeOrganization) {
    return <p className="text-sm text-zinc-500">Select a workspace first.</p>;
  }

  if (isLoading) return <p className="text-sm text-zinc-500">Loading audit logs…</p>;
  if (error) return <p className="text-sm text-red-600">{(error as Error).message}</p>;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Audit log</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Compliance and admin activity for {activeOrganization.name}
      </p>

      <div className="mt-8 overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Resource</th>
              <th className="px-4 py-3">User</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  No audit entries yet.
                </td>
              </tr>
            )}
            {data?.items.map((log) => (
              <tr key={log.id}>
                <td className="px-4 py-3 text-zinc-500">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-mono text-indigo-700">{log.action}</td>
                <td className="px-4 py-3">
                  {log.resourceType}
                  {log.resourceId && (
                    <span className="ml-1 text-xs text-zinc-400">
                      {log.resourceId.slice(0, 8)}…
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-500">
                  {log.userId?.slice(0, 8) ?? '—'}…
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
