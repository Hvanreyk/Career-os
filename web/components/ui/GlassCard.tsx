interface Props {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  gold?: boolean;
}

export function GlassCard({ children, className = '', hover = true, gold = false }: Props) {
  const base = 'glass-card rounded-2xl p-6';
  const goldRing = gold ? 'border-gold-400/20 shadow-[0_0_30px_rgba(212,175,55,0.08)]' : '';
  const hoverClass = hover ? 'glass-card' : 'glass';

  return (
    <div className={`${hover ? hoverClass : 'glass'} rounded-2xl p-6 ${goldRing} ${className}`}>
      {children}
    </div>
  );
}
