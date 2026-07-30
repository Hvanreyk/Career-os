'use client';

import { useState } from 'react';
import type { ResumeRow } from '@trajectoryos/core/resume/types';

interface Props {
  resume: ResumeRow;
  busy: boolean;
  onSave: (patch: {
    fullName: string | null; email: string | null; phone: string | null;
    linkedinUrl: string | null; location: string | null;
  }) => void;
}

const FIELDS = [
  { key: 'full_name', label: 'Full name', max: 120, placeholder: 'Alex Nguyen' },
  { key: 'email', label: 'Email', max: 254, placeholder: 'alex@uni.edu.au' },
  { key: 'phone', label: 'Phone', max: 40, placeholder: '+61 4xx xxx xxx' },
  { key: 'linkedin_url', label: 'LinkedIn', max: 200, placeholder: 'linkedin.com/in/alexnguyen' },
  { key: 'location', label: 'Location', max: 120, placeholder: 'Sydney, NSW' },
] as const;

/**
 * Inline editor for the resume header (name + contact details) that appears
 * at the top of every exported resume.
 */
export function ContactHeader({ resume, busy, onSave }: Props) {
  const [values, setValues] = useState<Record<string, string>>({
    full_name: resume.full_name ?? '',
    email: resume.email ?? '',
    phone: resume.phone ?? '',
    linkedin_url: resume.linkedin_url ?? '',
    location: resume.location ?? '',
  });
  const dirty = FIELDS.some(({ key }) => (resume[key] ?? '') !== values[key].trim());

  return (
    <div className="glass rounded-2xl border border-white/8 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-semibold text-sm">Contact header</h2>
        <button
          onClick={() => onSave({
            fullName: values.full_name.trim() || null,
            email: values.email.trim() || null,
            phone: values.phone.trim() || null,
            linkedinUrl: values.linkedin_url.trim() || null,
            location: values.location.trim() || null,
          })}
          disabled={!dirty || busy}
          className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs disabled:opacity-40"
        >Save contact details</button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {FIELDS.map(({ key, label, max, placeholder }) => (
          <label key={key} className="text-xs text-slate-500">{label}
            <input
              value={values[key]}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              maxLength={max}
              placeholder={placeholder}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
