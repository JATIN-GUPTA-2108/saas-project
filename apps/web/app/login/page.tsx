import Link from 'next/link';
import { LoginForm } from '@/features/auth/login-form';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white px-4 dark:from-zinc-950 dark:to-zinc-900">
      <div className="mb-8 text-center">
        <Link href="/" className="text-2xl font-bold tracking-tight text-indigo-700">
          LearnFlow
        </Link>
        <p className="mt-2 text-sm text-zinc-600">Sign in to your workspace</p>
      </div>
      <LoginForm />
    </div>
  );
}
