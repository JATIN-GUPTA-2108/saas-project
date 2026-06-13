'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuthCtx } from '@/hooks/use-auth-ctx';
import { inviteMember } from '@/services/organizations.service';

const INVITE_ROLES = [
  { slug: 'admin', label: 'Admin' },
  { slug: 'instructor', label: 'Instructor' },
  { slug: 'student', label: 'Student' },
];

export function MemberInviteForm({ organizationId }: { organizationId: string }) {
  const queryClient = useQueryClient();
  const ctx = useAuthCtx();
  const [email, setEmail] = useState('');
  const [roleSlug, setRoleSlug] = useState('student');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      inviteMember(ctx!, organizationId, { email: email.trim(), roleSlug }),
    onSuccess: (member) => {
      setEmail('');
      setError(null);
      setSuccess(`Invited ${member.user.email} as ${member.role.name}`);
      void queryClient.invalidateQueries({
        queryKey: ['members', organizationId],
      });
    },
    onError: (err: Error) => {
      setSuccess(null);
      setError(err.message);
    },
  });

  if (!ctx) return null;

  return (
    <form
      className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        mutation.mutate();
      }}
    >
      <h3 className="font-medium">Invite member</h3>
      <p className="mt-1 text-sm text-zinc-500">
        The user must already have a LearnFlow account (registered with this email).
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-xs font-medium" htmlFor="invite-email">
            Email
          </label>
          <input
            id="invite-email"
            type="email"
            required
            placeholder="colleague@company.com"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-40">
          <label className="mb-1 block text-xs font-medium" htmlFor="invite-role">
            Role
          </label>
          <select
            id="invite-role"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            value={roleSlug}
            onChange={(e) => setRoleSlug(e.target.value)}
          >
            {INVITE_ROLES.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {mutation.isPending ? 'Inviting…' : 'Invite'}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-3 text-sm text-green-700" role="status">
          {success}
        </p>
      )}
    </form>
  );
}
