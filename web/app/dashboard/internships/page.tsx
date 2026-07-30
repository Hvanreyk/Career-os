import Link from 'next/link';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { PageHeader, PageShell } from '@/components/ui/PageHeader';
import { StateBlock } from '@/components/ui/StateBlock';
import { StatusLabel } from '@/components/ui/Status';

export const metadata: Metadata = { title: 'Internship Tracker' };

// Placeholder — the tracker ships in a later phase. Lives under /dashboard so
// the proxy's auth guard applies.
export default function InternshipTrackerPage() {
  return (
    <PageShell width="narrow">
      <Link
        href="/dashboard"
        className="ml-label inline-flex min-h-[44px] items-center gap-2 transition-colors hover:text-bone"
      >
        <span aria-hidden="true">◂</span> Back to dashboard
      </Link>

      <PageHeader
        className="mt-2"
        label="Pipeline"
        title="Internship Application Tracker"
        actions={<StatusLabel>Not live</StatusLabel>}
      />

      <StateBlock
        kind="empty"
        label="Coming soon"
        title="Coming soon"
        className="mt-8"
        action={
          <Button href="/dashboard" variant="secondary">
            Back to dashboard
          </Button>
        }
      >
        Log every application, track deadlines, and see your interview pipeline across
        banks at a glance. We&apos;re building this into your dashboard — your account
        and career report are already set up for it.
      </StateBlock>
    </PageShell>
  );
}
