'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchAnalyticsEvents,
  fetchAnalyticsOverview,
} from '@/services/analytics.service';
import { useAuthStore } from '@/stores/auth-store';

export function AnalyticsDashboard() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const activeOrganization = useAuthStore((s) => s.activeOrganization);
  const ctx = {
    token: accessToken!,
    organizationId: activeOrganization!.id,
  };

  const { data: overview, isLoading } = useQuery({
    queryKey: ['analytics-overview', activeOrganization?.id],
    queryFn: () => fetchAnalyticsOverview(ctx),
    enabled: !!accessToken && !!activeOrganization,
  });

  const { data: events } = useQuery({
    queryKey: ['analytics-events', activeOrganization?.id],
    queryFn: () => fetchAnalyticsEvents(ctx),
    enabled: !!accessToken && !!activeOrganization,
  });

  if (!activeOrganization) {
    return <p className="text-sm text-zinc-500">Select a workspace first.</p>;
  }

  if (isLoading || !overview) {
    return <p className="text-sm text-zinc-500">Loading analytics…</p>;
  }

  const maxEventCount = Math.max(
    ...overview.eventsByType.map((e) => e.count),
    1,
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Last {overview.period} for {activeOrganization.name}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Courses', value: overview.totals.courses },
          { label: 'Published', value: overview.totals.publishedCourses },
          { label: 'Quiz attempts', value: overview.totals.quizAttempts },
          { label: 'Active learners', value: overview.totals.activeLearners },
          { label: 'Lessons completed', value: overview.totals.lessonCompletions },
          { label: 'Events (30d)', value: overview.totals.events },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      {overview.eventsByType.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-medium">Events by type</h2>
          <ul className="mt-4 space-y-3">
            {overview.eventsByType.map((e) => (
              <li key={e.eventType}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-mono text-zinc-600">{e.eventType}</span>
                  <span>{e.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${(e.count / maxEventCount) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-medium">Recent events</h2>
        <ul className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {events?.items.length === 0 && (
            <li className="p-4 text-sm text-zinc-500">No events recorded yet.</li>
          )}
          {events?.items.map((e) => (
            <li key={e.id} className="flex items-center justify-between p-4 text-sm">
              <span className="font-mono text-indigo-700">{e.eventType}</span>
              <span className="text-zinc-500">
                {new Date(e.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
