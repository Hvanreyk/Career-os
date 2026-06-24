'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const PHASES = [
  { id: 'analyse', label: 'Analysing your profile', duration: 1800 },
  { id: 'match', label: 'Matching against 300+ career paths', duration: 2200 },
  { id: 'score', label: 'Running scoring engine', duration: 1600 },
  { id: 'generate', label: 'Generating your Career Compass report', duration: 2400 },
];

export default function ReportLoadingPage() {
  const router = useRouter();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const run = async () => {
      const raw = localStorage.getItem('tos_profile');
      if (!raw) {
        setError('Profile data not found. Please complete the form again.');
        return;
      }

      let formData: unknown;
      try {
        formData = JSON.parse(raw);
      } catch {
        setError('Invalid profile data. Please try again.');
        return;
      }

      // Animate through phases while the API call runs in parallel
      let phase = 0;
      const advancePhase = () => {
        phase++;
        if (phase < PHASES.length) {
          setPhaseIndex(phase);
          setTimeout(advancePhase, PHASES[phase].duration);
        }
      };
      setTimeout(advancePhase, PHASES[0].duration);

      try {
        // Phase 1 — create: score + persist a 'processing' report (fast).
        const createRes = await fetch('/api/generate-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!createRes.ok) {
          const body = await createRes.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? 'Report generation failed');
        }

        const { reportId } = await createRes.json() as { reportId: string };
        localStorage.removeItem('tos_profile');

        // Phase 2 — process: run the LLM and flip status to completed.
        const processRes = await fetch(`/api/reports/${reportId}/process`, {
          method: 'POST',
        });

        if (!processRes.ok) {
          const body = await processRes.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? 'Report generation failed');
        }

        // Hold on the final phase animation briefly, then reveal the report.
        const elapsed = PHASES.slice(0, 3).reduce((s, p) => s + p.duration, 0);
        const remaining = Math.max(0, elapsed + PHASES[3].duration - 800);
        const wait = Math.max(0, remaining - elapsed);
        setTimeout(() => router.replace(`/report/${reportId}`), wait);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    };

    run();
  }, [router]);

  // Smooth progress bar across all phases
  useEffect(() => {
    const totalDuration = PHASES.reduce((s, p) => s + p.duration, 0);
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min((elapsed / totalDuration) * 100, 97));
    }, 80);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
        <div className="glass border border-red-400/20 rounded-2xl p-8 max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-red-400/10 border border-red-400/20 flex items-center justify-center mx-auto mb-5">
            <span className="text-red-400 text-2xl">!</span>
          </div>
          <h2 className="font-serif text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <button
            onClick={() => router.push('/onboard/goal')}
            className="px-6 py-3 bg-gold-400 text-navy-950 font-semibold rounded-xl hover:bg-gold-300 transition-all text-sm"
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.4) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'float-slow 12s ease-in-out infinite' }} />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, rgba(29,78,216,0.5) 0%, transparent 70%)', filter: 'blur(80px)', animation: 'float-medium 9s ease-in-out infinite' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm text-center">
        {/* Spinner */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <motion.circle
              cx="48" cy="48" r="40"
              fill="none"
              stroke="url(#spinGold)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={251.2}
              animate={{ strokeDashoffset: [251.2, 0] }}
              transition={{ duration: 8, ease: 'easeInOut', repeat: Infinity, repeatType: 'loop' }}
            />
            <defs>
              <linearGradient id="spinGold" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#d4af37" />
                <stop offset="100%" stopColor="#f0d77a" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="w-10 h-10 rounded-full bg-gold-400/10 border border-gold-400/30 flex items-center justify-center"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <svg className="w-5 h-5 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </motion.div>
          </div>
        </div>

        {/* Phase label */}
        <div className="h-8 mb-6 relative">
          <AnimatePresence mode="wait">
            <motion.p
              key={phaseIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="text-white font-medium text-base absolute inset-x-0"
            >
              {PHASES[phaseIndex].label}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Phase dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {PHASES.map((p, i) => (
            <motion.div
              key={p.id}
              className="h-1.5 rounded-full"
              animate={{
                width: i === phaseIndex ? 24 : 6,
                backgroundColor: i <= phaseIndex ? '#d4af37' : 'rgba(255,255,255,0.12)',
              }}
              transition={{ duration: 0.4 }}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-white/8 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #d4af37, #f0d77a)' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.08 }}
          />
        </div>

        <p className="text-slate-600 text-xs mt-5">
          This takes about 10–15 seconds
        </p>
      </div>
    </div>
  );
}
