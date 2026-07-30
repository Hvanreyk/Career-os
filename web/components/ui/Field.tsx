'use client';

import { useId } from 'react';

/**
 * Form primitives.
 *
 * Field owns the label/hint/error wiring so no page has to remember
 * aria-describedby or aria-invalid. Labels sit above the control, and errors
 * are text — never colour alone.
 */

interface FieldProps {
  label: string;
  /** Rendered under the label; use for units, formats, examples. */
  hint?: string;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: (props: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': boolean | undefined;
  }) => React.ReactNode;
}

export function Field({ label, hint, error, required, className = '', children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[13px] font-semibold text-bone">
        {label}
        {required && (
          <span className="ml-1 text-red" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {hint && (
        <p id={hintId} className="mt-1 text-[13px] leading-snug text-graphite">
          {hint}
        </p>
      )}
      <div className="mt-2">
        {children({
          id,
          'aria-describedby': describedBy,
          'aria-invalid': error ? true : undefined,
        })}
      </div>
      {error && (
        <p id={errId} role="alert" className="mt-2 flex gap-1.5 text-[13px] leading-snug text-red">
          <span aria-hidden="true">▲</span>
          {error}
        </p>
      )}
    </div>
  );
}

/** Checkbox or radio with its label, sized to a comfortable touch target. */
export function CheckControl({
  type = 'checkbox',
  checked,
  onChange,
  label,
  description,
  name,
  disabled,
}: {
  type?: 'checkbox' | 'radio';
  checked: boolean;
  onChange: () => void;
  label: React.ReactNode;
  description?: React.ReactNode;
  name?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex min-h-[44px] items-start gap-3 py-2">
      <input
        id={id}
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="ml-check mt-0.5"
      />
      <label htmlFor={id} className="cursor-pointer select-none">
        <span className="block text-[15px] leading-snug text-bone">{label}</span>
        {description && (
          <span className="mt-0.5 block text-[13px] leading-snug text-graphite">{description}</span>
        )}
      </label>
    </div>
  );
}
