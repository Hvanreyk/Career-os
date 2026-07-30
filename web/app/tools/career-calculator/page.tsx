import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { PageHeader, PageShell } from '@/components/ui/PageHeader';
import { StateBlock } from '@/components/ui/StateBlock';

export const metadata: Metadata = { title: 'Career Calculator' };

export default function CareerCalculatorPage() {
  return (
    <PageShell width="narrow">
      <PageHeader
        label="Career Calculator"
        title="Not built yet"
        lede="The Career Calculator will quantify your readiness for investment banking and identify the highest-leverage moves to improve your position. It is still in development."
      />

      <StateBlock
        kind="empty"
        className="mt-8"
        title="Use Career Compass in the meantime"
        action={
          <>
            <Button href="/onboard/goal">
              Build My Career Map <span aria-hidden="true">▸</span>
            </Button>
            <Button href="/tools/career-compass" variant="secondary">
              What it covers
            </Button>
          </>
        }
      >
        Career Compass already returns a stage classification, a fit assessment against real
        professional paths, ranked gaps and a prioritised action plan — which covers most of what
        this tool is intended to add.
      </StateBlock>
    </PageShell>
  );
}
