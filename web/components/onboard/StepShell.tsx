import Link from 'next/link';
import { Wordmark } from '@/components/ui/Wordmark';

const STEPS = ['Goal', 'University', 'Grades', 'Experience', 'Signals', 'Review'];

interface Props {
  step: number; // 1-based
  title: string;
  subtitle?: string;
  backHref?: string;
  children: React.ReactNode;
}

/**
 * Onboarding frame.
 *
 * Progress is a segmented rule rather than a bar — six discrete steps read as
 * six discrete steps. The step is also stated in text, so progress is never
 * carried by the accent colour alone.
 */
export function StepShell({ step, title, subtitle, backHref, children }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-rule">
        <div className="mx-auto flex h-14 max-w-[52rem] items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="MappedLabs — home" className="flex h-11 items-center pr-2">
            <Wordmark className="h-5 w-auto" ink="#edeae3" accent="#f0563a" />
          </Link>
          <span className="ml-label">
            Step {step} / {STEPS.length} · {STEPS[step - 1]}
          </span>
        </div>
        <div className="mx-auto max-w-[52rem] px-5 pb-4 sm:px-8">
          <ol className="flex gap-1.5" aria-label="Progress">
            {STEPS.map((s, i) => {
              const done = i < step - 1;
              const current = i === step - 1;
              return (
                <li
                  key={s}
                  className={`h-0.5 flex-1 ${
                    current ? 'bg-red' : done ? 'bg-bone' : 'bg-rule'
                  }`}
                  aria-current={current ? 'step' : undefined}
                >
                  <span className="sr-only">
                    {s}
                    {done ? ' (completed)' : current ? ' (current)' : ''}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[52rem] flex-1 px-5 py-10 sm:px-8 sm:py-14">
        {backHref && (
          <Link
            href={backHref}
            className="ml-btn ml-btn-text -ml-0.5 mb-4 inline-flex min-h-[44px] text-[14px]"
          >
            <span aria-hidden="true">◂</span> Back
          </Link>
        )}

        <h1 className="ml-title text-bone">{title}</h1>
        {subtitle && (
          <p className="mt-3 max-w-[62ch] text-[16px] leading-[1.65] text-graphite">{subtitle}</p>
        )}

        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
