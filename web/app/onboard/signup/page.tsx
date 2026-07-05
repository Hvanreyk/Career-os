'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { StepShell } from '@/components/onboard/StepShell';
import { createClient } from '@/lib/supabase/client';
import { Mail, Loader2, Lock, ArrowRight } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmSent, setConfirmSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [existingEmail, setExistingEmail] = useState<string | null>(null);

  // Already signed in (e.g. redoing the assessment) — no new account needed.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setExistingEmail(user.email);
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/report/loading`,
      },
    });

    if (authError) {
      setLoading(false);
      setError(authError.message);
      return;
    }

    // Supabase signals "email already registered" (with confirmations on) by
    // returning a user with no identities instead of an error.
    if (data.user && data.user.identities?.length === 0) {
      setLoading(false);
      setError('An account with this email already exists. Log in instead.');
      return;
    }

    if (data.session) {
      // Email confirmation disabled — we're signed in, generate straight away.
      router.push('/report/loading');
      return;
    }

    setLoading(false);
    setConfirmSent(true);
  };

  if (existingEmail) {
    return (
      <StepShell
        step={6}
        title="You're signed in"
        subtitle="No new account needed — generate your report now."
        backHref="/onboard/review"
      >
        <div className="glass border border-gold-400/20 rounded-2xl p-8 text-center">
          <p className="text-slate-400 text-sm mb-6">
            Signed in as <span className="text-gold-400">{existingEmail}</span>
          </p>
          <button
            onClick={() => router.push('/report/loading')}
            className="w-full py-4 bg-gold-400 text-navy-950 font-semibold rounded-xl hover:bg-gold-300 transition-all shadow-[0_0_24px_rgba(212,175,55,0.3)] flex items-center justify-center gap-2"
          >
            Generate My Report <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={async () => {
              await createClient().auth.signOut();
              setExistingEmail(null);
            }}
            className="mt-4 text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            Use a different account
          </button>
        </div>
      </StepShell>
    );
  }

  if (confirmSent) {
    return (
      <StepShell
        step={6}
        title="Check your email"
        subtitle="Confirm your address to finish creating your account."
        backHref="/onboard/review"
      >
        <div className="glass border border-gold-400/20 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gold-400/10 flex items-center justify-center mx-auto mb-5">
            <Mail className="w-7 h-7 text-gold-400" />
          </div>
          <h2 className="font-serif text-xl font-bold text-white mb-2">Confirmation email sent</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            Click the link in the email to activate your account — your report will be
            generated as soon as you&apos;re confirmed. You can log in with your password
            from then on.
          </p>
          <p className="text-slate-500 text-xs">
            Sent to <span className="text-gold-400">{email}</span>
          </p>
          <button
            onClick={() => setConfirmSent(false)}
            className="mt-6 text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            Use a different email
          </button>
        </div>
      </StepShell>
    );
  }

  return (
    <StepShell
      step={6}
      title="Create your account"
      subtitle="Set an email and password so you can come back to your report anytime."
      backHref="/onboard/review"
    >
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
          <label className="text-xs text-slate-400 uppercase tracking-wider block mb-2">
            Password
          </label>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full bg-navy-800/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-gold-400/40 transition-colors"
          />
        </div>

        {error && (
          <div className="text-red-400 text-xs px-1">
            {error}{' '}
            {error.toLowerCase().includes('already') && (
              <Link href="/login?next=/report/loading" className="text-gold-400 hover:text-gold-300 underline">
                Go to login
              </Link>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email || password.length < 8}
          className="w-full py-4 bg-gold-400 text-navy-950 font-semibold rounded-xl hover:bg-gold-300 transition-all shadow-[0_0_24px_rgba(212,175,55,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          {loading ? 'Creating account...' : 'Create Account & Generate Report'}
        </button>

        <p className="text-slate-600 text-xs text-center leading-relaxed">
          Already have an account?{' '}
          <Link href="/login?next=/report/loading" className="text-gold-400/80 hover:text-gold-300">
            Log in
          </Link>{' '}
          and we&apos;ll generate your report from this profile.
        </p>
      </form>
    </StepShell>
  );
}
