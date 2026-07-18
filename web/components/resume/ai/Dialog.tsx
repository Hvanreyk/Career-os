'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

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
      className={`glass mt-16 max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-navy-950 p-6 w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} backdrop:bg-navy-950/80 backdrop:backdrop-blur-sm`}
    >
      <div className="flex items-start justify-between gap-4 mb-1">
        <h2 className="text-white font-serif text-xl font-bold">{title}</h2>
        <button onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
      </div>
      {subtitle && <p className="text-slate-400 text-sm mb-4">{subtitle}</p>}
      {children}
    </dialog>
  );
}
