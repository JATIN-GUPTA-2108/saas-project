'use client';

import { useAuthCtx } from '@/hooks/use-auth-ctx';
import { usePermissions } from '@/hooks/use-permissions';
import { CreateOrgForm } from './create-org-form';
import { MemberInviteForm } from './member-invite-form';
import { MemberList } from './member-list';

export function TeamSettings() {
  const ctx = useAuthCtx();
  const { has } = usePermissions();

  if (!ctx) {
    return (
      <p className="text-sm text-zinc-500">
        Select a workspace from the header to manage your team.
      </p>
    );
  }

  const canInvite = has('member:invite');

  return (
    <div>
      <h1 className="text-2xl font-semibold">Team</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Manage members and workspaces for your organization.
      </p>

      <section className="mt-8 space-y-6">
        {canInvite && <MemberInviteForm organizationId={ctx.organizationId} />}
        {!canInvite && (
          <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900">
            You can view team members but need invite permission to add new ones.
          </p>
        )}

        <div>
          <h2 className="mb-3 text-lg font-medium">Members</h2>
          <MemberList organizationId={ctx.organizationId} />
        </div>

        <CreateOrgForm />
      </section>
    </div>
  );
}
