'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StepShell } from '@/components/onboard/StepShell';
import { useOnboard } from '@/lib/onboard/context';
import type { ExperienceEntry, ExpType, FirmTier, Industry, HowObtained } from '@/lib/onboard/types';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const EXP_TYPES: { value: ExpType; label: string }[] = [
  { value: 'summer_internship', label: 'Summer Internship' },
  { value: 'winter_internship', label: 'Winter Internship' },
  { value: 'penultimate_internship', label: 'Penultimate Internship' },
  { value: 'part_time', label: 'Part-time Role' },
  { value: 'full_time', label: 'Full-time Role' },
  { value: 'grad_program', label: 'Graduate Program' },
];

const FIRM_TIERS: { value: FirmTier; label: string }[] = [
  { value: 'bb', label: 'Bulge Bracket (BB)' },
  { value: 'elite_boutique_and_mm', label: 'Elite Boutique / Mid-Market' },
  { value: 'boutique', label: 'Boutique' },
  { value: 'big4', label: 'Big 4' },
  { value: 'private_equity', label: 'Private Equity' },
  { value: 'corporate', label: 'Corporate / Other' },
  { value: 'government', label: 'Government' },
  { value: 'other', label: 'Other' },
];

const INDUSTRIES: { value: Industry; label: string }[] = [
  { value: 'ib', label: 'Investment Banking' },
  { value: 'big4_advisory', label: 'Big 4 Advisory / M&A' },
  { value: 'big4_audit', label: 'Big 4 Audit' },
  { value: 'private_equity', label: 'Private Equity' },
  { value: 'capital_markets', label: 'Capital Markets' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'corporate', label: 'Corporate Finance' },
  { value: 'law', label: 'Law' },
  { value: 'government', label: 'Government' },
  { value: 'other', label: 'Other' },
];

const HOW_OBTAINED: { value: HowObtained; label: string }[] = [
  { value: 'online_application', label: 'Online application' },
  { value: 'cold_email', label: 'Cold email / networking' },
  { value: 'ocr', label: 'Campus recruitment (OCR)' },
  { value: 'society_referral', label: 'Finance society referral' },
  { value: 'internal_referral', label: 'Internal / personal referral' },
  { value: 'co_op_program', label: 'Co-op program placement' },
  { value: 'unknown', label: 'Other / not sure' },
];

const DURATIONS = [1, 2, 3, 4, 6, 12];

const BLANK_EXP: ExperienceEntry = {
  type: 'summer_internship',
  firm: '',
  firm_tier: 'bb',
  industry: 'ib',
  year: new Date().getFullYear() - 1,
  duration_months: 3,
  how_obtained: 'online_application',
  converted_to_ft: 'NA',
};

function ExperienceCard({
  exp,
  index,
  onUpdate,
  onDelete,
}: {
  exp: ExperienceEntry;
  index: number;
  onUpdate: (e: ExperienceEntry) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(true);
  const isInternship = ['summer_internship', 'winter_internship', 'penultimate_internship', 'internship'].includes(exp.type);
  const currentYear = new Date().getFullYear();

  return (
    <div className="glass border border-white/8 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <div className="text-sm font-semibold text-white">
            {exp.firm || `Experience ${index + 1}`}
          </div>
          {exp.firm && (
            <div className="text-xs text-slate-500 mt-0.5">
              {EXP_TYPES.find((t) => t.value === exp.type)?.label} · {exp.year}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-slate-600 hover:text-red-400 transition-colors p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/6">
          <div className="pt-4 grid grid-cols-2 gap-3">
            {/* Type */}
            <div className="col-span-2">
              <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1.5">Type</label>
              <select
                value={exp.type}
                onChange={(e) => onUpdate({ ...exp, type: e.target.value as ExpType, converted_to_ft: ['full_time', 'grad_program'].includes(e.target.value) ? 'NA' : exp.converted_to_ft })}
                className="w-full bg-navy-800/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gold-400/40"
              >
                {EXP_TYPES.map((t) => <option key={t.value} value={t.value} className="bg-navy-900">{t.label}</option>)}
              </select>
            </div>

            {/* Firm */}
            <div className="col-span-2">
              <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1.5">Firm name</label>
              <input
                value={exp.firm}
                onChange={(e) => onUpdate({ ...exp, firm: e.target.value })}
                placeholder="e.g. J.P. Morgan"
                className="w-full bg-navy-800/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-gold-400/40"
              />
            </div>

            {/* Firm tier */}
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1.5">Firm level</label>
              <select
                value={exp.firm_tier}
                onChange={(e) => onUpdate({ ...exp, firm_tier: e.target.value as FirmTier })}
                className="w-full bg-navy-800/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gold-400/40"
              >
                {FIRM_TIERS.map((t) => <option key={t.value} value={t.value} className="bg-navy-900">{t.label}</option>)}
              </select>
            </div>

            {/* Industry */}
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1.5">Area</label>
              <select
                value={exp.industry}
                onChange={(e) => onUpdate({ ...exp, industry: e.target.value as Industry })}
                className="w-full bg-navy-800/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gold-400/40"
              >
                {INDUSTRIES.map((i) => <option key={i.value} value={i.value} className="bg-navy-900">{i.label}</option>)}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1.5">Year</label>
              <select
                value={exp.year}
                onChange={(e) => onUpdate({ ...exp, year: parseInt(e.target.value) })}
                className="w-full bg-navy-800/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gold-400/40"
              >
                {Array.from({ length: 10 }, (_, i) => currentYear - i).map((y) => (
                  <option key={y} value={y} className="bg-navy-900">{y}</option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1.5">Duration</label>
              <div className="flex gap-1.5 flex-wrap">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onUpdate({ ...exp, duration_months: d })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      exp.duration_months === d
                        ? 'border-gold-400/60 bg-gold-400/10 text-gold-300'
                        : 'border-white/10 text-slate-500 hover:border-white/25 hover:text-white'
                    }`}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>

            {/* How obtained */}
            <div className="col-span-2">
              <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1.5">How did you get it?</label>
              <select
                value={exp.how_obtained}
                onChange={(e) => onUpdate({ ...exp, how_obtained: e.target.value as HowObtained })}
                className="w-full bg-navy-800/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-gold-400/40"
              >
                {HOW_OBTAINED.map((h) => <option key={h.value} value={h.value} className="bg-navy-900">{h.label}</option>)}
              </select>
            </div>

            {/* Convert to FT — only for internships */}
            {isInternship && (
              <div className="col-span-2">
                <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1.5">
                  Did it lead to a return offer?
                </label>
                <div className="flex gap-2">
                  {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }, { v: 'NA' as const, l: 'N/A' }].map(({ v, l }) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => onUpdate({ ...exp, converted_to_ft: v })}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                        exp.converted_to_ft === v
                          ? 'border-gold-400/60 bg-gold-400/10 text-gold-300'
                          : 'border-white/10 text-slate-500 hover:border-white/25 hover:text-white'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExperiencePage() {
  const { data, update } = useOnboard();
  const router = useRouter();

  const addExp = () => {
    if (data.experiences.length < 5) {
      update({ experiences: [...data.experiences, { ...BLANK_EXP }] });
    }
  };

  const updateExp = (i: number, e: ExperienceEntry) => {
    const exps = [...data.experiences];
    exps[i] = e;
    update({ experiences: exps });
  };

  const deleteExp = (i: number) => {
    update({ experiences: data.experiences.filter((_, idx) => idx !== i) });
  };

  return (
    <StepShell
      step={4}
      title="Work experience"
      subtitle="Add finance-relevant roles. Up to 5 experiences."
      backHref="/onboard/grades"
    >
      <div className="space-y-3">
        {data.experiences.map((exp, i) => (
          <ExperienceCard
            key={i}
            exp={exp}
            index={i}
            onUpdate={(e) => updateExp(i, e)}
            onDelete={() => deleteExp(i)}
          />
        ))}

        {data.experiences.length < 5 && (
          <button
            type="button"
            onClick={addExp}
            className="w-full py-4 glass border border-dashed border-white/20 rounded-2xl text-slate-400 hover:text-gold-300 hover:border-gold-400/30 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            {data.experiences.length === 0 ? 'Add your first experience' : 'Add another experience'}
          </button>
        )}

        {/* Lateral flag */}
        {data.experiences.some((e) => e.type === 'full_time') && (
          <button
            type="button"
            onClick={() => update({ is_lateral_candidate: !data.is_lateral_candidate })}
            className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl border transition-all ${
              data.is_lateral_candidate
                ? 'border-gold-400/40 bg-gold-400/8 text-white'
                : 'border-white/10 text-slate-400 hover:border-white/25'
            }`}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${data.is_lateral_candidate ? 'border-gold-400 bg-gold-400' : 'border-slate-600'}`}>
              {data.is_lateral_candidate && <span className="text-navy-950 text-xs font-bold">✓</span>}
            </div>
            <span className="text-sm">I&apos;m a lateral candidate (moving from another industry into IB)</span>
          </button>
        )}

        {data.is_lateral_candidate && (
          <input
            value={data.current_external_role}
            onChange={(e) => update({ current_external_role: e.target.value })}
            placeholder="Current role (e.g. Big 4 audit senior)"
            className="w-full bg-navy-800/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-gold-400/40"
          />
        )}

        <button
          onClick={() => router.push('/onboard/signals')}
          className="w-full py-4 bg-gold-400 text-navy-950 font-semibold rounded-xl hover:bg-gold-300 transition-all shadow-[0_0_24px_rgba(212,175,55,0.3)]"
        >
          Continue →
        </button>

        {data.experiences.length === 0 && (
          <button
            type="button"
            onClick={() => router.push('/onboard/signals')}
            className="w-full py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            Skip — I don&apos;t have finance experience yet
          </button>
        )}
      </div>
    </StepShell>
  );
}
