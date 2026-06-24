'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

const STEPS = ['Goal', 'University', 'Grades', 'Experience', 'Signals', 'Review'];

interface Props {
  step: number; // 1-based
  title: string;
  subtitle?: string;
  backHref?: string;
  children: React.ReactNode;
}

export function StepShell({ step, title, subtitle, backHref, children }: Props) {
  const progress = (step / STEPS.length) * 100;

  return (
    <div className="flex-1 flex flex-col items-center px-4 py-8 pt-24">
      {/* Progress bar */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500 uppercase tracking-widest">
            Step {step} of {STEPS.length}
          </span>
          <span className="text-xs text-gold-400 font-semibold">{STEPS[step - 1]}</span>
        </div>
        <div className="h-1 rounded-full bg-navy-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        {/* Step dots */}
        <div className="flex justify-between mt-2.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i < step ? 'bg-gold-400' : i === step - 1 ? 'bg-gold-400' : 'bg-navy-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-lg"
      >
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-5 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </Link>
        )}

        <div className="mb-7">
          <h1 className="font-serif text-3xl font-bold text-white mb-2">{title}</h1>
          {subtitle && <p className="text-slate-400 text-sm leading-relaxed">{subtitle}</p>}
        </div>

        {children}
      </motion.div>
    </div>
  );
}
