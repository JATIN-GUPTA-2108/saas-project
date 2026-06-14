'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { ApiError } from '@/lib/api';
import { useAuthCtx } from '@/hooks/use-auth-ctx';
import {
  askQuestion,
  fetchMyAttempt,
  fetchQuizByLesson,
  generateKeyConcepts,
  generateQuiz,
  generateSummary,
  submitQuizAttempt,
} from '@/services/quizzes.service';
import type { QuizAttemptResult } from '@/types/quiz';

export function QuizTake({
  courseId,
  lessonId,
  lessonTitle,
  canGenerate,
  hasLessonContent,
}: {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  canGenerate: boolean;
  hasLessonContent: boolean;
}) {
  const queryClient = useQueryClient();
  const ctx = useAuthCtx();
  const orgId = ctx?.organizationId;

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [summary, setSummary] = useState('');
  const [keyConcepts, setKeyConcepts] = useState<string[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [questionCount, setQuestionCount] = useState(5);

  const { data: quiz, isLoading, refetch } = useQuery({
    queryKey: ['quiz', orgId, lessonId],
    queryFn: async () => {
      try {
        return await fetchQuizByLesson(ctx!, lessonId);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    enabled: !!ctx,
    retry: false,
    refetchInterval: (query) =>
      query.state.data?.status === 'GENERATING' ? 2000 : false,
  });

  const { data: previousAttempt } = useQuery({
    queryKey: ['quiz-attempt', orgId, quiz?.id],
    queryFn: async () => {
      try {
        return await fetchMyAttempt(ctx!, quiz!.id);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    enabled: !!ctx && !!quiz?.id && quiz.status === 'READY',
    retry: false,
  });

  const summaryMutation = useMutation({
    mutationFn: () => generateSummary(ctx!, lessonId),
    onSuccess: (data) => {
      setSummary(data);
    },
  });

  const keyConceptsMutation = useMutation({
    mutationFn: () => generateKeyConcepts(ctx!, lessonId),
    onSuccess: (data) => {
      setKeyConcepts(data);
    },
  });

  const answerMutation = useMutation({
    mutationFn: () => askQuestion(ctx!, lessonId, question),
    onSuccess: (data) => {
      setAnswer(data);
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => generateQuiz(ctx!, lessonId, questionCount),
    onSuccess: () => {
      setResult(null);
      void queryClient.invalidateQueries({ queryKey: ['quiz', orgId, lessonId] });
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => submitQuizAttempt(ctx!, quiz!.id, answers),
    onSuccess: (data) => {
      setResult(data);
      void queryClient.invalidateQueries({ queryKey: ['quiz-attempt', orgId, quiz?.id] });
    },
  });

  if (!ctx) {
    return <p className="text-sm text-zinc-500">Select a workspace first.</p>;
  }

  if (isLoading) {
    return <p className="text-sm text-zinc-500">Loading quiz…</p>;
  }

  const generateControls = canGenerate && hasLessonContent && (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm">
        Questions:
        <select
          value={questionCount}
          onChange={(e) => setQuestionCount(Number(e.target.value))}
          className="rounded-lg border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          disabled={generateMutation.isPending || quiz?.status === 'GENERATING'}
        >
          {[3, 5, 7, 10, 15].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => generateMutation.mutate()}
        disabled={generateMutation.isPending || quiz?.status === 'GENERATING'}
        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        {generateMutation.isPending
          ? 'Starting…'
          : quiz
            ? 'Regenerate AI quiz'
            : 'Generate AI quiz'}
      </button>
    </div>
  );

  if (!hasLessonContent) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        This lesson has no content yet. Add lesson content on the course page before
        generating a quiz.
        <Link
          href={`/dashboard/courses/${courseId}`}
          className="mt-2 block font-medium text-indigo-700 hover:underline"
        >
          ← Back to course
        </Link>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 p-6 dark:border-zinc-700">
        <p className="text-sm text-zinc-600">No quiz for this lesson yet.</p>
        {generateControls}
        {generateMutation.isError && (
          <p className="mt-2 text-sm text-red-600">
            {(generateMutation.error as Error).message}
          </p>
        )}
      </div>
    );
  }

  if (quiz.status === 'GENERATING') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Generating {questionCount} quiz questions with AI…
        <button
          type="button"
          onClick={() => refetch()}
          className="ml-2 underline"
        >
          Refresh
        </button>
      </div>
    );
  }

  if (quiz.status === 'FAILED') {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Quiz generation failed: {quiz.errorMessage}
        {generateControls}
      </div>
    );
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-indigo-50 p-4 dark:bg-indigo-950/40">
          <p className="text-lg font-semibold">
            Score: {result.score}/{result.maxScore} ({result.percentage}%)
          </p>
        </div>
        <ul className="space-y-3">
          {result.results.map((r, i) => (
            <li
              key={r.questionId}
              className={`rounded-lg border p-3 text-sm ${
                r.correct
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <p className="font-medium">
                {i + 1}. {r.question}
              </p>
              {r.explanation && (
                <p className="mt-1 text-zinc-600">{r.explanation}</p>
              )}
            </li>
          ))}
        </ul>
        <div className="flex gap-4 text-sm">
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setAnswers({});
            }}
            className="text-indigo-600 hover:underline"
          >
            Try again
          </button>
          <Link
            href={`/dashboard/courses/${courseId}`}
            className="text-indigo-600 hover:underline"
          >
            ← Back to course
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link
        href={`/dashboard/courses/${courseId}`}
        className="text-sm text-indigo-600 hover:underline"
      >
        ← Back to course
      </Link>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => summaryMutation.mutate()}
          disabled={summaryMutation.isPending}
          className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-60"
        >
          {summaryMutation.isPending ? 'Generating…' : 'Generate AI Summary'}
        </button>
        <button
          type="button"
          onClick={() => keyConceptsMutation.mutate()}
          disabled={keyConceptsMutation.isPending}
          className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-60"
        >
          {keyConceptsMutation.isPending
            ? 'Extracting…'
            : 'Extract Key Concepts'}
        </button>
      </div>

      {summary && (
        <div className="prose prose-sm mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold">Lesson Summary</h3>
          {summary.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}

      {keyConcepts.length > 0 && (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-lg font-semibold">Key Concepts</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {keyConcepts.map((concept) => (
              <li
                key={concept}
                className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-800"
              >
                {concept}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-lg font-semibold">Ask a question</h3>
        <form
          className="mt-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (question.trim()) {
              answerMutation.mutate();
            }
          }}
        >
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What is the main purpose of..."
            className="w-full rounded-lg border-zinc-300 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            rows={3}
          />
          <button
            type="submit"
            disabled={answerMutation.isPending || !question.trim()}
            className="mt-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {answerMutation.isPending ? 'Thinking…' : 'Ask AI'}
          </button>
        </form>
        {answerMutation.isSuccess && (
          <div className="prose prose-sm mt-4 rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800 dark:text-zinc-200">
            {answer}
          </div>
        )}
        {answerMutation.isError && (
          <p className="mt-2 text-sm text-red-600">
            {(answerMutation.error as Error).message}
          </p>
        )}
      </div>

      <h2 className="mt-6 text-xl font-semibold">{quiz.title}</h2>
      <p className="mt-1 text-sm text-zinc-500">{lessonTitle}</p>

      {previousAttempt && (
        <p className="mt-3 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800">
          Your last attempt: {previousAttempt.score}/{previousAttempt.maxScore} (
          {previousAttempt.percentage}%) on{' '}
          {new Date(previousAttempt.completedAt).toLocaleString()}
        </p>
      )}

      {canGenerate && generateControls}

      <form
        className="mt-6 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          submitMutation.mutate();
        }}
      >
        {quiz.questions.map((q, i) => (
          <fieldset
            key={q.id}
            className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <legend className="font-medium">
              {i + 1}. {q.question}
            </legend>
            <div className="mt-3 space-y-2">
              {q.options.map((opt, idx) => (
                <label
                  key={idx}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="radio"
                    name={q.id}
                    required
                    checked={answers[q.id] === idx}
                    onChange={() =>
                      setAnswers((prev) => ({ ...prev, [q.id]: idx }))
                    }
                  />
                  {opt}
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <button
          type="submit"
          disabled={submitMutation.isPending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {submitMutation.isPending ? 'Submitting…' : 'Submit answers'}
        </button>
      </form>
    </div>
  );
}