import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { PageHeader, PageShell } from '@/components/ui/PageHeader';
import { StatusLabel } from '@/components/ui/Status';

export const metadata: Metadata = { title: 'Pricing' };

const plans = [
  {
    name: 'Starter',
    featured: false,
    description: 'For students exploring their options and getting oriented.',
    features: [
      'Career stage assessment',
      'Basic profile scoring',
      'Recruiting timeline overview',
      'Access to resource library',
    ],
  },
  {
    name: 'Pro',
    featured: true,
    description: 'For serious candidates actively preparing for IB recruiting.',
    features: [
      'Full Career Compass access',
      'Professional path matching (K-NN)',
      'Personalised gap analysis',
      'Prioritised action plan',
      'AI-generated coaching report',
      'Recruiting deadline tracker',
    ],
  },
  {
    name: 'Elite',
    featured: false,
    description: 'For candidates who want every possible edge.',
    features: [
      'Everything in Pro',
      'Weekly updated action plans',
      'Deal knowledge tracker',
      'Application pipeline management',
      'Priority support',
      'Early access to new tools',
    ],
  },
];

/**
 * Presented as a comparison register rather than three cards with a scaled-up
 * middle one — nothing here has a price yet, so inflating one tier visually
 * would be selling a decision that cannot be made.
 */
export default function PricingPage() {
  return (
    <PageShell>
      <PageHeader
        label="Pricing"
        title="Not yet announced"
        lede="MappedLabs is still pre-launch. Pricing will be published at launch — these are the tiers as currently planned."
      />

      <div className="mt-10 grid grid-cols-1 gap-px bg-rule md:grid-cols-3">
        {plans.map((plan) => (
          <section key={plan.name} className="flex flex-col bg-ink p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[19px] font-bold uppercase tracking-[-0.02em] text-bone">
                {plan.name}
              </h2>
              {plan.featured && <StatusLabel tone="accent">Planned default</StatusLabel>}
            </div>
            <p className="mt-2 text-[15px] leading-snug text-graphite">{plan.description}</p>

            <div className="mt-5 border-t border-rule pt-4">
              <span className="ml-label">Price</span>
              <p className="mt-1.5 text-[17px] font-bold uppercase tracking-[-0.01em] text-bone">
                Announced at launch
              </p>
            </div>

            <ul className="mt-5 flex-1 border-t border-rule">
              {plan.features.map((f) => (
                <li key={f} className="ml-row flex gap-2.5 py-2.5 text-[14px] leading-snug text-bone/90">
                  <span className="ml-num shrink-0 text-graphite" aria-hidden="true">
                    ·
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-rule pt-8">
        <Button href="/onboard/goal" size="lg">
          Build My Career Map <span aria-hidden="true">▸</span>
        </Button>
        <p className="max-w-[52ch] text-[15px] leading-snug text-graphite">
          Career Compass is available now and generates a full report. No payment is taken up front.
        </p>
      </div>
    </PageShell>
  );
}
