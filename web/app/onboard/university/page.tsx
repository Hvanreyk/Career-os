'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StepShell } from '@/components/onboard/StepShell';
import { useOnboard } from '@/lib/onboard/context';
import { searchUniversities, normalizeUniversityName } from '@/lib/onboard/universities';
import type { DegreeType } from '@/lib/onboard/types';
import { X } from 'lucide-react';

const YEARS = [1, 2, 3, 4, 5, 6];
const DEGREE_TYPES: { value: DegreeType; label: string; example: string }[] = [
  {
    value: 'bachelor',
    label: 'Bachelor',
    example: 'A single undergraduate degree, e.g. a Bachelor of Commerce.',
  },
  {
    value: 'double_degree',
    label: 'Double Degree',
    example: 'An undergraduate bachelor\'s degree followed by a Master\'s or a clinical Doctorate — e.g. a Bachelor of Commerce/Laws, or Medicine (MD) and Dentistry pathways.',
  },
  {
    value: 'combined_degree',
    label: 'Combined Degree',
    example: 'Two bachelor\'s degrees studied together at the same time, e.g. a Bachelor of Commerce and Bachelor of Science, or a Bachelor of Commerce and Bachelor of Advanced Studies (very common combination).',
  },
  {
    value: 'honours',
    label: 'Honours',
    example: 'An extra year of research-based study after your bachelor\'s degree.',
  },
  {
    value: 'masters',
    label: 'Masters',
    example: 'A postgraduate degree, e.g. a Master of Finance.',
  },
  {
    value: 'mba',
    label: 'MBA',
    example: 'A Master of Business Administration, typically after work experience.',
  },
];

export default function UniversityPage() {
  const { data, update } = useOnboard();
  const router = useRouter();
  const [uniQuery, setUniQuery] = useState(data.university);
  const [showDropdown, setShowDropdown] = useState(false);
  const [majorInput, setMajorInput] = useState('');

  const results = searchUniversities(uniQuery).slice(0, 6);

  const commitUniversity = () => {
    const trimmed = uniQuery.trim();
    if (!trimmed) return;
    const normalized = normalizeUniversityName(trimmed);
    update({ university: normalized });
    setUniQuery(normalized);
  };

  const canContinue =
    data.university && data.degree && data.degree_type && data.current_year && data.majors.length > 0;

  const addMajor = () => {
    const trimmed = majorInput.trim();
    if (trimmed && !data.majors.includes(trimmed) && data.majors.length < 3) {
      update({ majors: [...data.majors, trimmed] });
      setMajorInput('');
    }
  };

  return (
    <StepShell
      step={2}
      title="Tell us about your degree"
      subtitle="Your university and academic background shapes your match pool."
      backHref="/onboard/goal"
    >
      <div className="space-y-5">
        {/* University */}
        <div>
          <label className="text-xs text-slate-400 uppercase tracking-wider block mb-2">University</label>
          <div className="relative">
            <input
              value={uniQuery}
              onChange={(e) => { setUniQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => { setShowDropdown(false); commitUniversity(); }, 150)}
              placeholder="Search your university..."
              className="w-full bg-navy-800/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-gold-400/40 transition-colors"
            />
            {showDropdown && results.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-navy-900 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                {results.map((u) => (
                  <button
                    key={u.name}
                    type="button"
                    onMouseDown={() => {
                      update({ university: u.name });
                      setUniQuery(u.name);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                  >
                    <span>{u.name}</span>
                    <span className="ml-2 text-[10px] text-slate-600 uppercase">{u.tier}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Degree name */}
        <div>
          <label className="text-xs text-slate-400 uppercase tracking-wider block mb-2">Degree name</label>
          <input
            value={data.degree}
            onChange={(e) => update({ degree: e.target.value })}
            placeholder="e.g. Bachelor of Commerce"
            className="w-full bg-navy-800/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-gold-400/40 transition-colors"
          />
        </div>

        {/* Degree type */}
        <div>
          <label className="text-xs text-slate-400 uppercase tracking-wider block mb-2">Degree type</label>
          <div className="grid grid-cols-3 gap-2">
            {DEGREE_TYPES.map((d) => (
              <div key={d.value} className="group relative">
                <button
                  type="button"
                  onClick={() => update({ degree_type: d.value })}
                  className={`w-full py-2.5 rounded-xl text-xs font-medium border transition-all ${
                    data.degree_type === d.value
                      ? 'border-gold-400/60 bg-gold-400/10 text-gold-300'
                      : 'border-white/10 text-slate-400 hover:border-white/25 hover:text-white'
                  }`}
                >
                  {d.label}
                </button>
                <div className="pointer-events-none absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-navy-900 border border-white/10 rounded-lg px-3 py-2 text-[11px] leading-snug text-slate-300 shadow-xl">
                    {d.example}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Majors */}
        <div>
          <label className="text-xs text-slate-400 uppercase tracking-wider block mb-2">
            Major(s) <span className="text-slate-600">(up to 3)</span>
          </label>
          <div className="flex gap-2 mb-2">
            <input
              value={majorInput}
              onChange={(e) => setMajorInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMajor())}
              placeholder="e.g. Finance"
              className="flex-1 bg-navy-800/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-gold-400/40 transition-colors"
            />
            <button
              type="button"
              onClick={addMajor}
              className="px-4 py-2 glass border border-white/15 text-slate-300 rounded-xl text-sm hover:border-gold-400/40 hover:text-gold-300 transition-all"
            >
              Add
            </button>
          </div>
          {data.majors.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.majors.map((m) => (
                <span key={m} className="inline-flex items-center gap-1.5 px-3 py-1 glass border border-gold-400/20 text-gold-300 text-xs rounded-full">
                  {m}
                  <button type="button" onClick={() => update({ majors: data.majors.filter((x) => x !== m) })}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Year */}
        <div>
          <label className="text-xs text-slate-400 uppercase tracking-wider block mb-2">Current year of study</label>
          <div className="flex gap-2">
            {YEARS.map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => update({ current_year: y })}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  data.current_year === y
                    ? 'border-gold-400/60 bg-gold-400/10 text-gold-300'
                    : 'border-white/10 text-slate-400 hover:border-white/25 hover:text-white'
                }`}
              >
                Y{y}
              </button>
            ))}
          </div>
        </div>

        {/* Co-op */}
        <button
          type="button"
          onClick={() => update({ is_co_op: !data.is_co_op })}
          className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-xl border transition-all ${
            data.is_co_op
              ? 'border-gold-400/40 bg-gold-400/8 text-white'
              : 'border-white/10 text-slate-400 hover:border-white/25'
          }`}
        >
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            data.is_co_op ? 'border-gold-400 bg-gold-400' : 'border-slate-600'
          }`}>
            {data.is_co_op && <span className="text-navy-950 text-xs font-bold">✓</span>}
          </div>
          <span className="text-sm font-medium">This is a Co-op program</span>
        </button>

        <button
          disabled={!canContinue}
          onClick={() => router.push('/onboard/grades')}
          className="w-full py-4 bg-gold-400 text-navy-950 font-semibold rounded-xl hover:bg-gold-300 transition-all shadow-[0_0_24px_rgba(212,175,55,0.3)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          Continue →
        </button>
      </div>
    </StepShell>
  );
}
