'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { fetchOrganizations } from '@/services/organizations.service';
import { useAuthStore } from '@/stores/auth-store';

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const activeOrganization = useAuthStore((s) => s.activeOrganization);
  const setActiveOrganization = useAuthStore((s) => s.setActiveOrganization);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login');
    }
  }, [accessToken, router]);

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

  if (!accessToken) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold text-indigo-700">
            LearnFlow
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-600">{user?.email}</span>
            <button
              type="button"
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="text-sm font-medium text-zinc-700 hover:text-indigo-600"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{user?.firstName ? `, ${user.firstName}` : ''}
        </h1>
        <p className="mt-1 text-zinc-600">
          Phase 1 foundation — organizations, auth, and RBAC are live.
        </p>

        <section className="mt-10">
          <h2 className="text-lg font-medium">Your workspaces</h2>
          {isLoading ? (
            <p className="mt-4 text-sm text-zinc-500">Loading…</p>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

        {activeOrganization && (
          <section className="mt-10 rounded-xl border border-dashed border-zinc-300 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
            <h3 className="font-medium">Active workspace</h3>
            <p className="mt-1 text-sm text-zinc-600">
              {activeOrganization.name} — ready for Phase 2 (courses, uploads, video
              pipeline).
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
