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

export async function generateSummary(ctx: AuthCtx, lessonId: string) {
  return apiRequest<string>(`/quizzes/lessons/${lessonId}/summary`, {
    ...ctx,
    method: 'POST',
  });
}

export async function generateKeyConcepts(ctx: AuthCtx, lessonId: string) {
  return apiRequest<string[]>(`/quizzes/lessons/${lessonId}/key-concepts`, {
    ...ctx,
    method: 'POST',
  });
}

export async function askQuestion(
  ctx: AuthCtx,
  lessonId: string,
  question: string,
) {
  return apiRequest<string>(`/quizzes/lessons/${lessonId}/ask`, {
    ...ctx,
    method: 'POST',
    body: { question },
  });
}

export async function fetchQuizByLesson(ctx: AuthCtx, lessonId: string) {
  return apiRequest<Quiz | null>(`/quizzes/lesson/${lessonId}`, ctx);
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