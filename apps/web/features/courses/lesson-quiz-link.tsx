'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ApiError } from '@/lib/api';
import { useAuthCtx } from '@/hooks/use-auth-ctx';
import { fetchQuizByLesson } from '@/services/quizzes.service';

export function LessonQuizLink({
  courseId,
  lessonId,
  hasContent,
  canManage,
}: {
  courseId: string;
  lessonId: string;
  hasContent: boolean;
  canManage: boolean;
}) {
  const ctx = useAuthCtx();

  const { data: quiz } = useQuery({
    queryKey: ['quiz', ctx?.orgId, lessonId],
    queryFn: async () => {
      try {
        return await fetchQuizByLesson(ctx!, lessonId);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    enabled: !!ctx && hasContent,
    retry: false,
    refetchInterval: (q) =>
      q.state.data?.status === 'GENERATING' ? 3000 : false,
  });

  if (!hasContent) {
    return (
      <span className="text-zinc-400" title="Add lesson content to enable quizzes">
        Quiz (needs content)
      </span>
    );
  }

  const href = `/dashboard/courses/${courseId}/lessons/${lessonId}/quiz`;
  const statusLabel =
    quiz?.status === 'GENERATING'
      ? ' · generating…'
      : quiz?.status === 'FAILED'
        ? ' · failed'
        : quiz?.status === 'READY'
          ? ' · ready'
          : '';

  return (
    <Link href={href} className="text-indigo-600 hover:underline">
      {canManage ? 'Manage quiz' : 'Take quiz'}
      {statusLabel}
    </Link>
  );
}
