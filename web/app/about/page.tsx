import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { PageHeader, PageShell } from '@/components/ui/PageHeader';

export const metadata: Metadata = { title: 'About Us' };

const sections = [
  {
    id: '01',
    title: 'Mission',
    body: 'To give every ambitious finance student access to the same quality of guidance that was previously only available through elite networks, expensive coaching, or sheer luck of connection.',
  },
  {
    id: '02',
    title: 'Why we built it',
    body: 'We watched talented students miss out on investment banking roles — not because they lacked ability, but because they lacked structure. They applied too late, prepared for the wrong things, or had no way to benchmark themselves against people who made it. We built the tool we wish we had.',
  },
  {
    id: '03',
    title: 'Built by students',
    body: "MappedLabs was built by two young entrepreneurs who navigated the same recruiting gauntlet. We understand the anxiety of unsure timelines, the frustration of vague advice, and the pressure of competing against candidates who seem to know things you don't. That lived experience shapes everything we build.",
  },
  {
    id: '04',
    title: 'Vision',
    body: 'A world where where you go to school or who you know no longer determines whether you get a shot at high finance — where every student with the drive to compete has the tools to do it intelligently.',
  },
];

export default function AboutPage() {
  return (
    <PageShell width="narrow">
      <PageHeader
        label="About"
        title="Built with purpose"
        lede="MappedLabs was founded by two young entrepreneurs who saw how difficult it can be for students to break into investment banking without the right guidance, structure, or network. We built MappedLabs to give ambitious students a clearer system for preparing, improving and positioning themselves."
      />

      <div className="mt-10">
        {sections.map((s) => (
          <section
            key={s.id}
            className="ml-row grid grid-cols-1 gap-x-8 gap-y-2 py-7 sm:grid-cols-[7rem_minmax(0,1fr)]"
          >
            <div className="flex items-baseline gap-3">
              <span className="ml-num text-[13px] text-rule-bright" aria-hidden="true">
                {s.id}
              </span>
              <h2 className="text-[15px] font-bold uppercase tracking-[-0.01em] text-bone">
                {s.title}
              </h2>
            </div>
            <p className="max-w-[68ch] text-[16px] leading-[1.68] text-graphite">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-rule pt-8">
        <Button href="/onboard/goal" size="lg">
          Build My Career Map <span aria-hidden="true">▸</span>
        </Button>
        <p className="text-[15px] text-graphite">
          Understand where you stand and what to do next.
        </p>
      </div>
    </PageShell>
  );
}
