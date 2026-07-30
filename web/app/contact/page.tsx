import type { Metadata } from 'next';
import { ContactForm } from '@/components/ui/ContactForm';
import { PageHeader, PageShell } from '@/components/ui/PageHeader';

export const metadata: Metadata = { title: 'Contact' };

/* Left as the trajectoryos address deliberately — this is the mailbox that
   actually exists. Renaming it cosmetically would break the only way to reach
   us. */
const details = [
  { label: 'Email', value: 'hello@trajectoryos.com', href: 'mailto:hello@trajectoryos.com' },
  { label: 'Location', value: 'Sydney, Australia' },
  { label: 'Response time', value: 'Within 1–2 business days' },
];

export default function ContactPage() {
  return (
    <PageShell>
      <PageHeader
        label="Contact"
        title="Get in touch"
        lede="Have a question, a partnership idea, or want to know more about how the scoring works? Send us a note."
      />

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
        <dl className="border-t border-rule">
          {details.map((d) => (
            <div key={d.label} className="ml-row py-4">
              <dt className="ml-label">{d.label}</dt>
              <dd className="mt-1.5 text-[15px] text-bone">
                {d.href ? (
                  <a href={d.href} className="ml-btn ml-btn-text inline-flex min-h-[44px] text-[15px]">
                    {d.value}
                  </a>
                ) : (
                  d.value
                )}
              </dd>
            </div>
          ))}
        </dl>

        <ContactForm />
      </div>
    </PageShell>
  );
}
