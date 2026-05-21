import Link from 'next/link';
import { RegisterForm } from '@/features/auth/register-form';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white px-4 py-12 dark:from-zinc-950 dark:to-zinc-900">
      <div className="mb-8 text-center">
        <Link href="/" className="text-2xl font-bold tracking-tight text-indigo-700">
          LearnFlow
        </Link>
        <p className="mt-2 text-sm text-zinc-600">Create your LMS workspace</p>
      </div>
      <RegisterForm />
    </div>
  );
}
