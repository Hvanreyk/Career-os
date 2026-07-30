'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { StepShell } from '@/components/onboard/StepShell';
import { StepActions } from '@/components/onboard/StepParts';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { createClient } from '@/lib/supabase/client';

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
        <div className="ml-panel p-5 sm:p-6">
          <span className="ml-label">Signed in as</span>
          <p className="ml-num mt-2 break-all text-[15px] text-bone">{existingEmail}</p>
        </div>

        <StepActions
          onContinue={() => router.push('/report/loading')}
          label="Generate my report"
        />

        <div className="mt-2">
          <Button
            variant="ghost"
            onClick={async () => {
              await createClient().auth.signOut();
              setExistingEmail(null);
            }}
          >
            Use a different account
          </Button>
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
        <div className="ml-panel p-5 sm:p-6">
          <span className="ml-label">▸ Confirmation sent</span>
          <p className="mt-3 max-w-[62ch] text-[16px] leading-[1.65] text-bone/90">
            Click the link in the email to activate your account — your report will be
            generated as soon as you&apos;re confirmed. You can log in with your password
            from then on.
          </p>
          <p className="mt-4 text-[14px] text-graphite">
            Sent to <span className="ml-num break-all text-bone">{email}</span>
          </p>
        </div>

        <div className="mt-4">
          <Button variant="ghost" onClick={() => setConfirmSent(false)}>
            Use a different email
          </Button>
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
      <form onSubmit={submit} className="space-y-5">
        <Field label="Email address" required>
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

        <Field label="Password" hint="At least 8 characters." required>
          {(props) => (
            <input
              {...props}
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="ml-field"
            />
          )}
        </Field>

        {error && (
          <p role="alert" className="flex gap-1.5 text-[14px] leading-snug text-red">
            <span aria-hidden="true">▲</span>
            <span>
              {error}{' '}
              {error.toLowerCase().includes('already') && (
                <Link href="/login?next=/report/loading" className="underline">
                  Go to login
                </Link>
              )}
            </span>
          </p>
        )}

        <StepActions
          type="submit"
          disabled={!email || password.length < 8}
          loading={loading}
          label={loading ? 'Creating account…' : 'Create account & generate report'}
          note={
            <>
              Already have an account?{' '}
              <Link href="/login?next=/report/loading" className="text-red hover:underline">
                Log in
              </Link>{' '}
              and we&apos;ll generate your report from this profile.
            </>
          }
        />
      </form>
    </StepShell>
  );
}
