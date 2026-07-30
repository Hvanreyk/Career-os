'use client';

import { useState } from 'react';
import { StepShell } from '@/components/onboard/StepShell';
import { StepActions } from '@/components/onboard/StepParts';
import { createClient } from '@/lib/supabase/client';

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
        <div className="border border-rule bg-surface p-6" role="status">
          <span className="ml-label text-red">▸ Sent</span>
          <h2 className="mt-3 text-[18px] font-bold uppercase tracking-[-0.01em] text-bone">
            Magic link sent
          </h2>
          <p className="mt-3 text-[15px] leading-[1.6] text-graphite">
            Click the link in the email from{' '}
            <strong className="font-semibold text-bone">noreply@supabase.io</strong> to create your
            account and generate your report.
          </p>
          <dl className="mt-5 border-t border-rule pt-4">
            <dt className="ml-label">Sent to</dt>
            <dd className="ml-num mt-1 break-all text-[14px] text-bone">{email}</dd>
          </dl>
          <button
            onClick={() => setSent(false)}
            className="ml-btn ml-btn-text mt-5 min-h-[44px] text-[14px]"
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
      <form onSubmit={submit} noValidate>
        <label htmlFor="email" className="block text-[13px] font-semibold text-bone">
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@university.edu.au"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'email-err' : undefined}
          className="ml-field mt-2"
        />

        {error && (
          <p id="email-err" role="alert" className="mt-2 flex gap-1.5 text-[13px] leading-snug text-red">
            <span aria-hidden="true">▲</span>
            {error}
          </p>
        )}

        <StepActions
          type="submit"
          disabled={!email}
          loading={loading}
          label={loading ? 'Sending' : 'Send magic link'}
          note="No password needed. One click from your email and your report will be generated."
        />
      </form>
    </StepShell>
  );
}
