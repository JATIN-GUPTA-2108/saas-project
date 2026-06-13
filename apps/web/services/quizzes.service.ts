import { apiRequest } from '@/lib/api';
import type { Quiz, QuizAttemptResult } from '@/types/quiz';

type AuthCtx = { token: string; organizationId: string };

export async function generateQuiz(
  ctx: AuthCtx,
  lessonId: string,
  questionCount = 5,
) {
  return apiRequest<Quiz>('/quizzes/generate', {
    ...ctx,
    method: 'POST',
    body: { lessonId, questionCount },
  });
}

export async function fetchQuizByLesson(ctx: AuthCtx, lessonId: string) {
  return apiRequest<Quiz>(`/quizzes/lesson/${lessonId}`, ctx);
}

export async function submitQuizAttempt(
  ctx: AuthCtx,
  quizId: string,
  answers: Record<string, number>,
) {
  return apiRequest<QuizAttemptResult>(`/quizzes/${quizId}/attempts`, {
    ...ctx,
    method: 'POST',
    body: { answers },
  });
}

export type QuizAttemptSummary = {
  id: string;
  score: number;
  maxScore: number;
  percentage: number;
  completedAt: string;
};

export async function fetchMyAttempt(ctx: AuthCtx, quizId: string) {
  return apiRequest<QuizAttemptSummary>(`/quizzes/${quizId}/attempts/me`, ctx);
}
