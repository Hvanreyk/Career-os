'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';

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
    <form onSubmit={submit} className="space-y-5">
      <Field label="Email address" error={error || null}>
        {(props) => (
          <input
            {...props}
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.edu.au"
            className="ml-field"
          />
        )}
      </Field>

      <div>
        <Field label="Password">
          {(props) => (
            <input
              {...props}
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="ml-field"
            />
          )}
        </Field>
        <p className="mt-2">
          <Link
            href="/forgot-password"
            className="inline-flex min-h-[44px] items-center text-[13px] text-graphite hover:text-bone"
          >
            Forgot password?
          </Link>
        </p>
      </div>

      <Button type="submit" disabled={!email || !password} loading={loading} className="w-full">
        {loading ? 'Signing in…' : 'Log in'}
      </Button>

      <p className="text-[14px] leading-relaxed text-graphite">
        New here?{' '}
        <Link href="/onboard/goal" className="text-red hover:underline">
          Start your career assessment
        </Link>{' '}
        to create an account.
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-5 pb-16 pt-24">
      <div className="w-full max-w-[26rem]">
        <header className="border-b border-rule pb-5">
          <span className="ml-label">Account</span>
          <h1 className="ml-title mt-2.5 text-bone">Welcome back</h1>
          <p className="mt-3 text-[16px] leading-[1.6] text-graphite">
            Log in to your dashboard to view your Career Compass report.
          </p>
        </header>

        <div className="mt-7">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
