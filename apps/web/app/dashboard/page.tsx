'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { fetchOrganizations } from '@/services/organizations.service';
import { useAuthStore } from '@/stores/auth-store';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const activeOrganization = useAuthStore((s) => s.activeOrganization);
  const setActiveOrganization = useAuthStore((s) => s.setActiveOrganization);

  const { data: organizations, isLoading } = useQuery({
    queryKey: ['organizations', accessToken],
    queryFn: () => fetchOrganizations(accessToken!),
    enabled: !!accessToken,
  });

  useEffect(() => {
    if (organizations?.length && !activeOrganization) {
      setActiveOrganization(organizations[0]);
    }
  }, [organizations, activeOrganization, setActiveOrganization]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome{user?.firstName ? `, ${user.firstName}` : ''}
      </h1>
        <p className="mt-1 text-zinc-600">
          Manage courses, analytics, billing, and compliance for your workspace.
        </p>

        {activeOrganization ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard/courses"
              className="inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Courses
            </Link>
            <Link
              href="/dashboard/team"
              className="inline-flex rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-semibold hover:bg-zinc-100 dark:border-zinc-700"
            >
              Team
            </Link>
            <Link
              href="/dashboard/analytics"
              className="inline-flex rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-semibold hover:bg-zinc-100 dark:border-zinc-700"
            >
              Analytics
            </Link>
          </div>
        ) : (
          <p className="mt-6 text-sm text-zinc-500">
            Pick a workspace below or use the switcher in the header.
          </p>
        )}

      <section className="mt-10">
        <h2 className="text-lg font-medium">Your workspaces</h2>
        {isLoading ? (
          <p className="mt-4 text-sm text-zinc-500">Loading…</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {organizations?.map((org) => (
              <li key={org.id}>
                <button
                  type="button"
                  onClick={() => setActiveOrganization(org)}
                  className={`w-full rounded-xl border p-5 text-left transition ${
                    activeOrganization?.id === org.id
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                      : 'border-zinc-200 bg-white hover:border-indigo-300 dark:border-zinc-800 dark:bg-zinc-900'
                  }`}
                >
                  <p className="font-semibold">{org.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{org.slug}</p>
                  {org.role && (
                    <span className="mt-3 inline-block rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {org.role.name}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}