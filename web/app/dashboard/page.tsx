import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import {
  ArrowRight,
  BriefcaseBusiness,
  Compass,
  FileText,
  GraduationCap,
  Loader2,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import type { StudentProfile } from '@trajectoryos/core/scoring/types';

export const metadata: Metadata = { title: 'Dashboard' };

// Always render fresh — this page reflects live auth + report state.
export const dynamic = 'force-dynamic';

interface ReportRow {
  id: string;
  status: string;
  created_at: string;
}

const TIER_LABELS: Record<string, string> = {
  bb: 'Bulge Bracket',
  elite_boutique_and_mm: 'Elite Boutique / MM',
  boutique: 'Boutique',
  any: 'Any Level',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // The proxy already guards this route; this is defence in depth.
  if (!user) redirect('/login?next=/dashboard');

  // RLS scopes both queries to the signed-in user.
  const [{ data: reportRows }, { data: profileRow }] = await Promise.all([
    supabase
      .from('reports')
      .select('id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('student_profiles')
      .select('profile, updated_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const report = (reportRows?.[0] as ReportRow | undefined) ?? null;
  const profile = (profileRow?.profile as StudentProfile | undefined) ?? null;

  const firstName = user.email?.split('@')[0] ?? 'there';

  return (
    <div className="min-h-screen bg-navy-950 px-6 pt-28 pb-20">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold text-gold-400 uppercase tracking-widest mb-2">
              Dashboard
            </p>
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-white">
              Welcome back, <span className="capitalize">{firstName}</span>
            </h1>
            <p className="text-slate-400 text-sm mt-2">{user.email}</p>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white border border-white/10 hover:border-white/20 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </form>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Career report — the main card */}
          <div className="md:col-span-2 glass border border-gold-400/20 rounded-2xl p-7">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-gold-400/10 text-gold-400 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-white mb-1">
                    Your Career Compass Report
                  </h2>
                  {report ? (
                    <p className="text-slate-400 text-sm">
                      Generated{' '}
                      {new Date(report.created_at).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                      {report.status !== 'completed' && (
                        <span className="ml-2 inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-gold-400/10 text-gold-400">
                          {report.status === 'error' ? (
                            'needs retry'
                          ) : (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" /> finishing up
                            </>
                          )}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-slate-400 text-sm">
                      You haven&apos;t generated a report yet. Complete the assessment and
                      we&apos;ll map your path into investment banking.
                    </p>
                  )}
                </div>
              </div>

              {report ? (
                <Link
                  href={`/report/${report.id}`}
                  className="px-5 py-3 bg-gold-400 text-navy-950 font-semibold text-sm rounded-xl hover:bg-gold-300 transition-all shadow-[0_0_20px_rgba(212,175,55,0.25)] flex items-center gap-2"
                >
                  {report.status === 'completed' ? 'View Report' : 'Resume Report'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  href="/onboard/goal"
                  className="px-5 py-3 bg-gold-400 text-navy-950 font-semibold text-sm rounded-xl hover:bg-gold-300 transition-all shadow-[0_0_20px_rgba(212,175,55,0.25)] flex items-center gap-2"
                >
                  Start Assessment <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>

          {/* Profile summary */}
          <div className="glass border border-white/8 rounded-2xl p-7">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-white/5 text-slate-300 flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
              <h3 className="font-serif text-lg font-bold text-white">Your Profile</h3>
            </div>

            {profile ? (
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">University</dt>
                  <dd className="text-white font-medium text-right">{profile.university}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Degree</dt>
                  <dd className="text-white font-medium text-right">{profile.degree}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Year</dt>
                  <dd className="text-white font-medium">Year {profile.current_year}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Target</dt>
                  <dd className="text-white font-medium text-right">
                    {TIER_LABELS[profile.target_firm_tier] ?? profile.target_firm_tier}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-slate-400 text-sm">
                Complete the assessment to build your profile.
              </p>
            )}

            <Link
              href="/onboard/goal"
              className="mt-5 inline-flex items-center gap-2 text-sm text-gold-400 hover:text-gold-300 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {profile ? 'Update profile & re-run assessment' : 'Start the assessment'}
            </Link>
          </div>

          {/* Internship tracker */}
          <Link
            href="/dashboard/internships"
            className="glass border border-white/8 rounded-2xl p-7 hover:border-gold-400/25 transition-colors group"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-white/5 text-slate-300 flex items-center justify-center group-hover:bg-gold-400/10 group-hover:text-gold-400 transition-colors">
                <BriefcaseBusiness className="w-4 h-4" />
              </div>
              <h3 className="font-serif text-lg font-bold text-white">
                Internship Application Tracker
              </h3>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold-400/15 text-gold-400 font-medium uppercase tracking-wider">
                Soon
              </span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Track every application, deadline and interview stage across banks in one
              place — coming to your dashboard soon.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm text-gold-400 group-hover:text-gold-300 transition-colors">
              Preview <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>

          {/* Tools */}
          <div className="md:col-span-2 glass border border-white/8 rounded-2xl p-7">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-white/5 text-slate-300 flex items-center justify-center">
                <Compass className="w-4 h-4" />
              </div>
              <h3 className="font-serif text-lg font-bold text-white">Explore Tools</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/tools/career-compass"
                className="px-4 py-2 rounded-lg border border-white/10 text-sm text-slate-300 hover:text-white hover:border-white/20 transition-colors"
              >
                Career Compass
              </Link>
              <Link
                href="/tools/career-calculator"
                className="px-4 py-2 rounded-lg border border-white/10 text-sm text-slate-300 hover:text-white hover:border-white/20 transition-colors"
              >
                Career Calculator
              </Link>
              <Link
                href="/resources"
                className="px-4 py-2 rounded-lg border border-white/10 text-sm text-slate-300 hover:text-white hover:border-white/20 transition-colors"
              >
                Resources
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
