'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Mail } from 'lucide-react';

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
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-6 pt-24 pb-16">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-white mb-2">Reset your password</h1>
          <p className="text-slate-400 text-sm">
            We&apos;ll email you a link to set a new password.
          </p>
        </div>

        <div className="glass border border-white/10 rounded-2xl p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gold-400/10 flex items-center justify-center mx-auto mb-5">
                <Mail className="w-7 h-7 text-gold-400" />
              </div>
              <h2 className="font-serif text-xl font-bold text-white mb-2">Check your email</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                If an account exists for <span className="text-gold-400">{email}</span>, a
                password reset link is on its way.
              </p>
              <Link
                href="/login"
                className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
              >
                Back to login
              </Link>
            </div>
          ) : (
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

              {error && <div className="text-red-400 text-xs px-1">{error}</div>}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-4 bg-gold-400 text-navy-950 font-semibold rounded-xl hover:bg-gold-300 transition-all shadow-[0_0_24px_rgba(212,175,55,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <p className="text-slate-600 text-xs text-center">
                Remembered it?{' '}
                <Link href="/login" className="text-gold-400/80 hover:text-gold-300">
                  Back to login
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
