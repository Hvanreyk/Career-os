'use client';

import { motion, useTransform } from 'framer-motion';
import { ArrowRight, ChevronDown, TrendingUp, BarChart2, Target } from 'lucide-react';
import Link from 'next/link';
import { FloatingOrbs } from '@/components/background/FloatingOrbs';
import { useMouseParallax } from '@/lib/hooks/useMouseParallax';

export function Hero() {
  const { x, y } = useMouseParallax();

  const layer1X = useTransform(x, [-0.5, 0.5], [-18, 18]);
  const layer1Y = useTransform(y, [-0.5, 0.5], [-18, 18]);
  const layer2X = useTransform(x, [-0.5, 0.5], [-8, 8]);
  const layer2Y = useTransform(y, [-0.5, 0.5], [-8, 8]);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-navy-900 via-navy-950 to-navy-950" />
      <FloatingOrbs />

      {/* Radial highlight */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 30%, rgba(212,175,55,0.05) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16 py-24">
        {/* Left — copy */}
        <div className="flex-1 text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-gold-400/20 text-gold-400 text-xs font-semibold uppercase tracking-widest mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" />
            Career Intelligence Platform
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="font-serif text-5xl sm:text-6xl xl:text-7xl font-bold text-white leading-[1.08] tracking-tight mb-6"
          >
            Navigate Your Path{' '}
            <span className="text-gold-gradient">Into High Finance.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-slate-400 text-lg leading-relaxed max-w-xl mx-auto lg:mx-0 mb-10"
          >
            TrajectoryOS helps ambitious finance students break into investment banking with
            sharper preparation, smarter tools, and a clearer career strategy.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="flex flex-wrap items-center gap-4 justify-center lg:justify-start"
          >
            <Link
              href="/tools/career-compass"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-gold-400 text-navy-950 font-semibold rounded-xl hover:bg-gold-300 transition-all shadow-[0_0_28px_rgba(212,175,55,0.35)] hover:shadow-[0_0_44px_rgba(212,175,55,0.5)] active:scale-[0.98]"
            >
              Explore Career Compass
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 px-7 py-3.5 border border-white/15 text-white rounded-xl hover:border-gold-400/35 hover:text-gold-300 transition-all"
            >
              Learn About Us
            </Link>
          </motion.div>
        </div>

        {/* Right — dashboard card */}
        <motion.div
          className="flex-1 w-full max-w-md"
          style={{ x: layer1X, y: layer1Y }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.35 }}
        >
          <div className="glass-card rounded-2xl p-6 border border-gold-400/15 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
            {/* Card header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-widest mb-0.5">Career Compass</div>
                <div className="font-serif text-white font-semibold text-lg">Profile Overview</div>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-gold-400/12 text-gold-400 text-xs font-semibold">
                Stage S1
              </div>
            </div>

            {/* Fit score */}
            <motion.div
              style={{ x: layer2X, y: layer2Y }}
              className="glass rounded-xl p-4 mb-4 border border-gold-400/10"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-400">Profile Strength</span>
                <span className="text-gold-400 font-semibold text-sm">Strong Fit</span>
              </div>
              <div className="h-1.5 rounded-full bg-navy-800 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300"
                  initial={{ width: 0 }}
                  animate={{ width: '82%' }}
                  transition={{ duration: 1.2, delay: 0.8, ease: 'easeOut' }}
                />
              </div>
            </motion.div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Matched Pros', value: '10', icon: Target },
                { label: 'Reach Target', value: '100%', icon: TrendingUp },
                { label: 'Next Window', value: 'Jul 27', icon: BarChart2 },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="glass rounded-xl p-3 text-center border border-white/5">
                  <Icon className="w-3.5 h-3.5 text-gold-400 mx-auto mb-1.5" />
                  <div className="text-white font-semibold text-sm">{value}</div>
                  <div className="text-slate-500 text-[10px] mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Top action */}
            <div className="glass rounded-xl p-4 border border-white/5">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">
                Top Action
              </div>
              <div className="text-sm text-white font-medium">
                Secure your penultimate summer at a BB
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Apps open July 2027 · High effort
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500"
      >
        <span className="text-xs uppercase tracking-widest">Scroll</span>
        <ChevronDown className="w-4 h-4 animate-scroll-bounce" />
      </motion.div>
    </section>
  );
}
