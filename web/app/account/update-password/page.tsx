'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { StateBlock } from '@/components/ui/StateBlock';

// Reached from the password-recovery email (via /auth/callback, which creates a
// session) or by a logged-in user who wants to change their password. The proxy
// guards /account/*, so an expired recovery link lands on /login instead.
export default function UpdatePasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => setEmail(user?.email ?? null));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: authError } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push('/dashboard');
      router.refresh();
    }, 1500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-5 pb-16 pt-24">
      <div className="w-full max-w-[26rem]">
        {done ? (
          <StateBlock kind="empty" title="Password updated">
            <p>
              Taking you to your{' '}
              <Link href="/dashboard" className="text-red hover:underline">
                dashboard
              </Link>
              …
            </p>
          </StateBlock>
        ) : (
          <>
            <header className="border-b border-rule pb-5">
              <span className="ml-label">Account</span>
              <h1 className="ml-title mt-2.5 text-bone">Set a new password</h1>
              {email && (
                <p className="ml-num mt-3 text-[14px] text-graphite">
                  for <span className="text-bone">{email}</span>
                </p>
              )}
            </header>

            <form onSubmit={submit} className="mt-7 space-y-5">
              <Field label="New password" hint="At least 8 characters.">
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

              <Field label="Confirm new password" error={error || null}>
                {(props) => (
                  <input
                    {...props}
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat your new password"
                    className="ml-field"
                  />
                )}
              </Field>

              <Button
                type="submit"
                disabled={password.length < 8 || !confirm}
                loading={loading}
                className="w-full"
              >
                {loading ? 'Updating…' : 'Update password'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
