'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { StateBlock } from '@/components/ui/StateBlock';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/account/update-password`,
    });

    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-5 pb-16 pt-24">
      <div className="w-full max-w-[26rem]">
        {sent ? (
          <StateBlock
            kind="empty"
            title="Check your email"
            action={
              <Button href="/login" variant="secondary">
                Back to login
              </Button>
            }
          >
            <p>
              If an account exists for{' '}
              <span className="ml-num text-bone">{email}</span>, a password reset link is on
              its way.
            </p>
          </StateBlock>
        ) : (
          <>
            <header className="border-b border-rule pb-5">
              <span className="ml-label">Account</span>
              <h1 className="ml-title mt-2.5 text-bone">Reset your password</h1>
              <p className="mt-3 text-[16px] leading-[1.6] text-graphite">
                We&apos;ll email you a link to set a new password.
              </p>
            </header>

            <form onSubmit={submit} className="mt-7 space-y-5">
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

              <Button type="submit" disabled={!email} loading={loading} className="w-full">
                {loading ? 'Sending…' : 'Send reset link'}
              </Button>

              <p className="text-[14px] text-graphite">
                Remembered it?{' '}
                <Link href="/login" className="text-red hover:underline">
                  Back to login
                </Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
