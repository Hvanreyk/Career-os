import { OnboardProvider } from '@/lib/onboard/context';

export default function OnboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardProvider>
      <div className="flex min-h-screen flex-col bg-ink">{children}</div>
    </OnboardProvider>
  );
}
