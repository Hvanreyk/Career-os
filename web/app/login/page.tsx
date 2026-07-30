'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Loader2, LogIn } from 'lucide-react';

// Only allow same-site relative redirect targets ("/dashboard", not "//evil.com").
function safeNext(next: string | null): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return '/dashboard';
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setLoading(false);
      setError(
        authError.message === 'Invalid login credentials'
          ? 'Incorrect email or password.'
          : authError.message,
      );
      return;
    }

    const next = safeNext(searchParams.get('next'));
    // Refresh so server components (navbar state, dashboard) see the new session.
    router.push(next);
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="text-xs text-slate-400 uppercase tracking-wider block mb-2">
          Email address
        </label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@university.edu.au"
          className="w-full bg-navy-800/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-gold-400/40 transition-colors"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-slate-400 uppercase tracking-wider">Password</label>
          <Link
            href="/forgot-password"
            className="text-xs text-slate-500 hover:text-gold-400 transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
          className="w-full bg-navy-800/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-gold-400/40 transition-colors"
        />
      </div>

      {error && <div className="text-red-400 text-xs px-1">{error}</div>}

      <button
        type="submit"
        disabled={loading || !email || !password}
        className="w-full py-4 bg-gold-400 text-navy-950 font-semibold rounded-xl hover:bg-gold-300 transition-all shadow-[0_0_24px_rgba(212,175,55,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
        {loading ? 'Signing in...' : 'Log In'}
      </button>

      <p className="text-slate-600 text-xs text-center leading-relaxed">
        New here?{' '}
        <Link href="/onboard/goal" className="text-gold-400/80 hover:text-gold-300">
          Start your career assessment
        </Link>{' '}
        to create an account.
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-6 pt-24 pb-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-slate-400 text-sm">
            Log in to your dashboard to view your Career Compass report.
          </p>
        </div>
        <div className="glass border border-white/10 rounded-2xl p-8">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
