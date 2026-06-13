'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import { OrgSwitcher } from '@/features/organizations/org-switcher';
import { useAuthStore } from '@/stores/auth-store';

const BASE_NAV = [
  { href: '/dashboard', label: 'Overview', exact: true },
  { href: '/dashboard/courses', label: 'Courses' },
  { href: '/dashboard/team', label: 'Team' },
  { href: '/dashboard/analytics', label: 'Analytics', permission: 'analytics:view' },
  { href: '/dashboard/billing', label: 'Billing' },
  { href: '/dashboard/audit', label: 'Audit log', permission: 'audit:view' },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { has, isLoading: permissionsLoading } = usePermissions();

  const nav = BASE_NAV.filter(
    (item) => !item.permission || permissionsLoading || has(item.permission),
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold text-indigo-700">
            LearnFlow
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <OrgSwitcher />
            <span className="text-zinc-600">{user?.email}</span>
            <button
              type="button"
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="font-medium text-zinc-700 hover:text-indigo-600"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-8 px-6 py-8">
        <aside className="w-44 shrink-0">
          <nav className="flex flex-col gap-1">
            {nav.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200'
                      : 'text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
