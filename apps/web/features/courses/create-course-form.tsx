'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuthCtx } from '@/hooks/use-auth-ctx';
import { createCourse } from '@/services/courses.service';

export function CreateCourseForm() {
  const router = useRouter();
  const ctx = useAuthCtx();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createCourse(ctx!, { title, description: description || undefined }),
    onSuccess: (course) => router.push(`/dashboard/courses/${course.id}`),
    onError: (err: Error) => setError(err.message),
  });

  if (!ctx) {
    return <p className="text-sm text-zinc-500">Select a workspace first.</p>;
  }

  return (
    <form
      className="max-w-lg space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="title">
          Title
        </label>
        <input
          id="title"
          required
          minLength={2}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="desc">
          Description
        </label>
        <textarea
          id="desc"
          rows={4}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
      >
        {mutation.isPending ? 'Creating…' : 'Create course'}
      </button>
    </form>
  );
}
