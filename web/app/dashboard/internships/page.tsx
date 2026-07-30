import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, BriefcaseBusiness } from 'lucide-react';

export const metadata: Metadata = { title: 'Internship Tracker' };

// Placeholder — the tracker ships in a later phase. Lives under /dashboard so
// the proxy's auth guard applies.
export default function InternshipTrackerPage() {
  return (
    <div className="min-h-screen bg-navy-950 px-6 pt-28 pb-20">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>

        <div className="glass border border-white/10 rounded-2xl p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gold-400/10 text-gold-400 flex items-center justify-center mx-auto mb-6">
            <BriefcaseBusiness className="w-7 h-7" />
          </div>
          <p className="text-xs font-semibold text-gold-400 uppercase tracking-widest mb-3">
            Coming soon
          </p>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-white mb-3">
            Internship Application Tracker
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
            Log every application, track deadlines, and see your interview pipeline across
            banks at a glance. We&apos;re building this into your dashboard — your account
            and career report are already set up for it.
          </p>
        </div>
      </div>
    </div>
  );
}
