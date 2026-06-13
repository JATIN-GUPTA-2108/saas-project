'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useAuthCtx } from '@/hooks/use-auth-ctx';
import { usePermissions } from '@/hooks/use-permissions';
import { fetchCourses } from '@/services/courses.service';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-amber-100 text-amber-800',
  PUBLISHED: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-zinc-100 text-zinc-600',
};

export function CourseList() {
  const ctx = useAuthCtx();
  const { has } = usePermissions();
  const canCreate = has('course:create');

  const { data, isLoading, error } = useQuery({
    queryKey: ['courses', ctx?.orgId],
    queryFn: () => fetchCourses(ctx!),
    enabled: !!ctx,
  });

  if (!ctx) {
    return (
      <p className="text-sm text-zinc-500">
        Select a workspace from the header first.
      </p>
    );
  }

  if (isLoading) return <p className="text-sm text-zinc-500">Loading courses…</p>;
  if (error) return <p className="text-sm text-red-600">{(error as Error).message}</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Courses</h1>
        {canCreate && (
          <Link
            href="/dashboard/courses/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            New course
          </Link>
        )}
      </div>

      {data?.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <p className="text-zinc-600">No courses yet.</p>
          <Link
            href="/dashboard/courses/new"
            className="mt-3 inline-block text-sm font-medium text-indigo-600"
          >
            Create your first course →
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {data?.items.map((course) => (
            <li key={course.id}>
              <Link
                href={`/dashboard/courses/${course.id}`}
                className="block rounded-xl border border-zinc-200 bg-white p-5 transition hover:border-indigo-300 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold">{course.title}</h2>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[course.status]}`}
                  >
                    {course.status}
                  </span>
                </div>
                {course.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-600">
                    {course.description}
                  </p>
                )}
                <p className="mt-3 text-xs text-zinc-500">
                  {course.lessonCount} lesson{course.lessonCount !== 1 ? 's' : ''}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
