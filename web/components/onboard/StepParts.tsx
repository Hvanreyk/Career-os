import { Button } from '@/components/ui/Button';

/** A labelled group of controls. Uses a real fieldset so the label is announced. */
export function StepGroup({
  label,
  hint,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="ml-label">{label}</legend>
      {hint && <p className="mt-1.5 text-[13px] leading-snug text-graphite">{hint}</p>}
      <div className="mt-3">{children}</div>
    </fieldset>
  );
}

/** The step's forward action, pinned to the bottom of the form. */
export function StepActions({
  onContinue,
  disabled,
  loading,
  label = 'Continue',
  type = 'button',
  note,
}: {
  onContinue?: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  type?: 'button' | 'submit';
  note?: React.ReactNode;
}) {
  return (
    <div className="mt-9 border-t border-rule pt-6">
      <Button
        type={type}
        onClick={onContinue}
        disabled={disabled}
        loading={loading}
        size="lg"
        className="w-full sm:w-auto sm:min-w-[14rem]"
      >
        {label} {!loading && <span aria-hidden="true">▸</span>}
      </Button>
      {note && <p className="mt-3 max-w-[64ch] text-[15px] leading-snug text-graphite">{note}</p>}
    </div>
  );
}

/** One frame around the whole set; rows inside are split by hairlines. */
export function ChoiceList({ children }: { children: React.ReactNode }) {
  return (
    <div className="divide-y divide-rule border border-rule">{children}</div>
  );
}
