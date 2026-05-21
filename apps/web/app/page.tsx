import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-900 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-xl font-bold tracking-tight">LearnFlow</span>
        <nav className="flex gap-3 text-sm font-medium">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 transition hover:bg-white/10"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-white px-4 py-2 text-indigo-700 transition hover:bg-indigo-50"
          >
            Get started
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-24 pt-16 text-center">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-indigo-200">
          AI-Powered Multi-Tenant LMS
        </p>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
          Teach, learn, and scale — in one workspace
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-indigo-100">
          Organizations, RBAC, AI quiz generation, realtime classrooms, and video
          pipelines — built for production SaaS from day one.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/register"
            className="rounded-xl bg-white px-6 py-3 font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
          >
            Create free workspace
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-white/40 px-6 py-3 font-semibold transition hover:bg-white/10"
          >
            Sign in
          </Link>
        </div>
      </main>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-20 sm:grid-cols-3">
        {[
          {
            title: 'Multi-tenant',
            desc: 'Isolated organizations with role-based access control.',
          },
          {
            title: 'AI-native',
            desc: 'Generate quizzes from lesson content with validated outputs.',
          },
          {
            title: 'Realtime',
            desc: 'Classrooms, chat, presence, and live notifications.',
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur"
          >
            <h3 className="font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm text-indigo-100">{item.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
