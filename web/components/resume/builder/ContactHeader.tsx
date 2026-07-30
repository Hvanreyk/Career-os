'use client';

import { useState } from 'react';
import type { ResumeRow } from '@trajectoryos/core/resume/types';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';

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
    <Panel>
      <PanelHeader
        title="Contact header"
        label="Appears on every export"
        action={
          <span className="flex items-center gap-3">
            <span className="ml-label" aria-live="polite">
              {busy ? 'Saving…' : dirty ? 'Unsaved changes' : 'Saved'}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={!dirty || busy}
              onClick={() => onSave({
                fullName: values.full_name.trim() || null,
                email: values.email.trim() || null,
                phone: values.phone.trim() || null,
                linkedinUrl: values.linkedin_url.trim() || null,
                location: values.location.trim() || null,
              })}
            >
              Save contact details
            </Button>
          </span>
        }
      />
      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
        {FIELDS.map(({ key, label, max, placeholder }) => (
          <Field key={key} label={label}>
            {(props) => (
              <input
                {...props}
                value={values[key]}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                maxLength={max}
                placeholder={placeholder}
                className="ml-field"
              />
            )}
          </Field>
        ))}
      </div>
    </Panel>
  );
}
