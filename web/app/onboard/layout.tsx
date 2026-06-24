import { OnboardProvider } from '@/lib/onboard/context';
import { FloatingOrbs } from '@/components/background/FloatingOrbs';

export default function OnboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardProvider>
      <div className="relative min-h-screen bg-navy-950 flex flex-col">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900 to-navy-950 pointer-events-none" />
        <FloatingOrbs />
        <div className="relative z-10 flex-1 flex flex-col">{children}</div>
      </div>
    </OnboardProvider>
  );
}
