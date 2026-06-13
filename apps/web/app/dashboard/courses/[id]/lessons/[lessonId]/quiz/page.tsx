'use client';

import { useQuery } from '@tanstack/react-query';
import { use } from 'react';
import { useAuthCtx } from '@/hooks/use-auth-ctx';
import { usePermissions } from '@/hooks/use-permissions';
import { QuizTake } from '@/features/quizzes/quiz-take';
import { fetchLessons } from '@/services/courses.service';

export default function LessonQuizPage({
  params,
}: {
  params: Promise<{ id: string; lessonId: string }>;
}) {
  const { id: courseId, lessonId } = use(params);
  const ctx = useAuthCtx();
  const { has } = usePermissions();

  const { data: lessons } = useQuery({
    queryKey: ['lessons', ctx?.orgId, courseId],
    queryFn: () => fetchLessons(ctx!, courseId),
    enabled: !!ctx,
  });

  const lesson = lessons?.find((l) => l.id === lessonId);
  const canGenerate = has('course:update');
  const hasLessonContent = !!lesson?.content?.trim();

  return (
    <QuizTake
      courseId={courseId}
      lessonId={lessonId}
      lessonTitle={lesson?.title ?? 'Lesson'}
      canGenerate={canGenerate}
      hasLessonContent={hasLessonContent}
    />
  );
}
