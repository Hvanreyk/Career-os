'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Accessible centered modal shell used by the resume AI flows. A native
 * `<dialog>` opened via `showModal()` gets initial focus, Tab-trapping, and
 * Escape-to-close from the browser for free; we additionally restore focus
 * to whatever was focused before the dialog opened.
 */
export function Dialog({ title, subtitle, wide, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    if (!dialog.open) dialog.showModal();
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleCancel = (event: Event) => {
      // Escape fires `cancel` on a native dialog; run our own close handler
      // instead of the browser's default (which would just close silently).
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      className={`mt-16 max-h-[85vh] w-full overflow-y-auto border border-rule bg-surface p-5 text-bone sm:p-6 ${wide ? 'max-w-3xl' : 'max-w-xl'} backdrop:bg-ink/85`}
    >
      <div className="mb-1 flex items-start justify-between gap-4">
        <h2 className="text-[20px] font-bold uppercase leading-tight tracking-[-0.02em] text-bone">
          {title}
        </h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center text-graphite hover:text-bone"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
      {subtitle && (
        <p className="mb-5 max-w-[62ch] text-[15px] leading-[1.6] text-graphite">{subtitle}</p>
      )}
      {children}
    </dialog>
  );
}
