'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Lock } from 'lucide-react';

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
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-6 pt-24 pb-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-white mb-2">Set a new password</h1>
          {email && (
            <p className="text-slate-400 text-sm">
              for <span className="text-gold-400">{email}</span>
            </p>
          )}
        </div>

        <div className="glass border border-white/10 rounded-2xl p-8">
          {done ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gold-400/10 flex items-center justify-center mx-auto mb-5">
                <Lock className="w-7 h-7 text-gold-400" />
              </div>
              <h2 className="font-serif text-xl font-bold text-white mb-2">Password updated</h2>
              <p className="text-slate-400 text-sm">
                Taking you to your{' '}
                <Link href="/dashboard" className="text-gold-400 hover:text-gold-300">
                  dashboard
                </Link>
                ...
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider block mb-2">
                  New password
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

              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider block mb-2">
                  Confirm new password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your new password"
                  className="w-full bg-navy-800/60 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-gold-400/40 transition-colors"
                />
              </div>

              {error && <div className="text-red-400 text-xs px-1">{error}</div>}

              <button
                type="submit"
                disabled={loading || password.length < 8 || !confirm}
                className="w-full py-4 bg-gold-400 text-navy-950 font-semibold rounded-xl hover:bg-gold-300 transition-all shadow-[0_0_24px_rgba(212,175,55,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
