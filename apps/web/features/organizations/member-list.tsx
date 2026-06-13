'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthCtx } from '@/hooks/use-auth-ctx';
import { fetchMembers } from '@/services/organizations.service';

export function MemberList({ organizationId }: { organizationId: string }) {
  const ctx = useAuthCtx();

  const { data: members, isLoading } = useQuery({
    queryKey: ['members', organizationId],
    queryFn: () => fetchMembers(ctx!, organizationId),
    enabled: !!ctx,
  });

  if (isLoading) {
    return <p className="text-sm text-zinc-500">Loading members…</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
          <tr>
            <th className="px-4 py-3 font-medium">Member</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Joined</th>
          </tr>
        </thead>
        <tbody>
          {members?.map((m) => (
            <tr
              key={m.id}
              className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
            >
              <td className="px-4 py-3">
                <p className="font-medium">
                  {[m.user.firstName, m.user.lastName].filter(Boolean).join(' ') ||
                    m.user.email}
                </p>
                <p className="text-xs text-zinc-500">{m.user.email}</p>
              </td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium dark:bg-zinc-800">
                  {m.role.name}
                </span>
              </td>
              <td className="px-4 py-3 text-zinc-500">
                {new Date(m.joinedAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!members?.length && (
        <p className="px-4 py-6 text-sm text-zinc-500">No members yet.</p>
      )}
    </div>
  );
}
