'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { register } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth-store';

export function RegisterForm() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    organizationName: '',
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      register({
        email: form.email,
        password: form.password,
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        organizationName: form.organizationName || undefined,
      }),
    onSuccess: (data) => {
      setSession({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        organization: data.organization,
      });
      router.push('/dashboard');
    },
    onError: (err: Error) => setError(err.message),
  });

  const update = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      className="flex w-full max-w-md flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        mutation.mutate();
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="firstName">
            First name
          </label>
          <input
            id="firstName"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-900"
            value={form.firstName}
            onChange={(e) => update('firstName', e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="lastName">
            Last name
          </label>
          <input
            id="lastName"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-900"
            value={form.lastName}
            onChange={(e) => update('lastName', e.target.value)}
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="org">
          Workspace name
        </label>
        <input
          id="org"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-900"
          placeholder="Acme Learning"
          value={form.organizationName}
          onChange={(e) => update('organizationName', e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-900"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-900"
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        {mutation.isPending ? 'Creating account…' : 'Create account'}
      </button>
      <p className="text-center text-sm text-zinc-600">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-indigo-600">
          Sign in
        </Link>
      </p>
    </form>
  );
}
