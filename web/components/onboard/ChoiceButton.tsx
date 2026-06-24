interface Props {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  description?: string;
  gold?: boolean;
}

export function ChoiceButton({ selected, onClick, children, description, gold }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-5 py-4 rounded-xl border transition-all ${
        selected
          ? gold
            ? 'border-gold-400 bg-gold-400/10 text-white shadow-[0_0_20px_rgba(212,175,55,0.15)]'
            : 'border-gold-400/60 bg-gold-400/8 text-white'
          : 'border-white/10 bg-white/2 text-slate-300 hover:border-white/25 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-4 h-4 rounded-full border-2 shrink-0 transition-colors flex items-center justify-center ${
            selected ? 'border-gold-400 bg-gold-400' : 'border-slate-600'
          }`}
        >
          {selected && <div className="w-1.5 h-1.5 rounded-full bg-navy-950" />}
        </div>
        <div>
          <div className="font-medium text-sm">{children}</div>
          {description && (
            <div className="text-xs text-slate-500 mt-0.5">{description}</div>
          )}
        </div>
      </div>
    </button>
  );
}
