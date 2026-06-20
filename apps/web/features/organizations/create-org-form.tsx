'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { createOrganization } from '@/services/organizations.service';
import { useAuthStore } from '@/stores/auth-store';

export function CreateOrgForm() {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const setActiveOrganization = useAuthStore((s) => s.setActiveOrganization);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => createOrganization(accessToken!, { name: name.trim() }),
    onSuccess: (org) => {
      setName('');
      setError(null);
      setActiveOrganization({ ...org, role: { slug: 'owner', name: 'Owner', permissions: [] } });
      void queryClient.invalidateQueries({ queryKey: ['organizations'] });
      void queryClient.invalidateQueries();
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <form
      className="rounded-xl border border-dashed border-zinc-300 p-5 dark:border-zinc-700"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <h3 className="font-medium">Create workspace</h3>
      <p className="mt-1 text-sm text-zinc-500">
        Add another organization you own.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          required
          minLength={2}
          placeholder="Workspace name"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
        >
          {mutation.isPending ? 'Creating…' : 'Create'}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}