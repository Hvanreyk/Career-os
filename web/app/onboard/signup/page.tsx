'use client';

import { useState } from 'react';
import { StepShell } from '@/components/onboard/StepShell';
import { createClient } from '@/lib/supabase/client';
import { Mail, Loader2 } from 'lucide-react';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/report/loading`,
      },
    });

    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <StepShell
        step={6}
        title="Check your email"
        subtitle="We sent a magic link to your inbox."
        backHref="/onboard/review"
      >
        <div className="glass border border-gold-400/20 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gold-400/10 flex items-center justify-center mx-auto mb-5">
            <Mail className="w-7 h-7 text-gold-400" />
          </div>
          <h2 className="font-serif text-xl font-bold text-white mb-2">Magic link sent</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            Click the link in the email from <strong className="text-white">noreply@supabase.io</strong> to
            create your account and generate your report.
          </p>
          <p className="text-slate-500 text-xs">
            Sent to <span className="text-gold-400">{email}</span>
          </p>
          <button
            onClick={() => setSent(false)}
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
      subtitle="Enter your email — we'll send a magic link to sign you in."
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.edu.au"
            className="w-full bg-navy-800/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-gold-400/40 transition-colors"
          />
        </div>

        {error && (
          <div className="text-red-400 text-xs px-1">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading || !email}
          className="w-full py-4 bg-gold-400 text-navy-950 font-semibold rounded-xl hover:bg-gold-300 transition-all shadow-[0_0_24px_rgba(212,175,55,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          {loading ? 'Sending...' : 'Send Magic Link'}
        </button>

        <p className="text-slate-600 text-xs text-center leading-relaxed">
          No password needed. One click from your email and your report will be generated.
        </p>
      </form>
    </StepShell>
  );
}
