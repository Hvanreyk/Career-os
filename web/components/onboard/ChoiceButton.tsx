interface Props {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  description?: string;
  /** Retained from the previous API; emphasis is now carried by selection alone. */
  gold?: boolean;
}

/**
 * A selectable row, not a card. Selection is marked three ways — a filled
 * indicator, an accent left edge and a raised ground — so it never depends on
 * colour alone.
 */
export function ChoiceButton({ selected, onClick, children, description }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      /* No border of its own — ChoiceList draws one frame and the rows are
         separated by hairlines, so a list of options reads as one register
         rather than a stack of cards. */
      className={`ml-row-hover flex w-full min-h-[56px] items-start gap-3.5 border-l-2 px-4 py-3.5 text-left transition-colors ${
        selected ? 'border-l-red bg-raised text-bone' : 'border-l-transparent text-graphite hover:text-bone'
      }`}
    >
      <span
        className={`mt-0.5 grid h-4 w-4 shrink-0 place-content-center border ${
          selected ? 'border-red bg-red' : 'border-rule-bright'
        }`}
        aria-hidden="true"
      >
        {selected && <span className="block h-1.5 w-1.5 bg-ink" />}
      </span>
      <span className="min-w-0">
        <span className="block text-[15px] font-medium leading-snug text-bone">{children}</span>
        {description && (
          <span className="mt-1 block text-[13px] leading-snug text-graphite">{description}</span>
        )}
      </span>
    </button>
  );
}
