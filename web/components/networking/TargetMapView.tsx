'use client';

import Link from 'next/link';
import type { AlumniIntel, CoverageSummary, CoverageStatus } from '@trajectoryos/core/networking';
import { STAGE_LABELS } from '@trajectoryos/core/networking';
import { StatusLabel } from '@/components/ui/Status';
import { SectionHeading, TableScroll, Th } from './ui';

/** The word is the status; the tone only reinforces it. */
const STATUS_DISPLAY: Record<CoverageStatus, { label: string; tone: 'accent' | 'warn' | 'neutral' | 'ok' }> = {
  none: { label: 'No coverage', tone: 'accent' },
  thin: { label: 'Thin', tone: 'warn' },
  building: { label: 'Building', tone: 'neutral' },
  covered: { label: 'Covered', tone: 'ok' },
};

interface Props {
  base: string;
  coverage: CoverageSummary;
  alumni: AlumniIntel | null;
  university: string;
}

/**
 * Coverage register + aggregate alumni intelligence. Everything shown is
 * deterministic and reconstructable by the student — no opaque scores.
 */
export function TargetMapView({ base, coverage, alumni, university }: Props) {
  return (
    <div className="space-y-12">
      {/* ── Firm coverage ──────────────────────────────────────── */}
      <section>
        <SectionHeading
          title="Coverage by target firm"
          label={`${coverage.rows.length} firm${coverage.rows.length === 1 ? '' : 's'}`}
        />
        <p className="mt-3 max-w-[70ch] text-[16px] leading-[1.6] text-graphite">
          Goal per firm: two junior contacts (analyst or associate) plus one senior contact (VP or
          above).
        </p>

        {coverage.rows.length === 0 ? (
          <p className="mt-4 text-[16px] text-graphite">Add bank targets to see coverage.</p>
        ) : (
          <TableScroll className="mt-5">
            <table className="w-full min-w-[32rem] border-collapse text-left">
              <caption className="sr-only">
                Relationship coverage at each target firm, against a goal of two junior and one
                senior contact
              </caption>
              <thead>
                <tr>
                  <Th>Firm</Th>
                  <Th>Coverage</Th>
                  <Th>Junior</Th>
                  <Th>Senior</Th>
                  <Th className="hidden md:table-cell">Deepest stage</Th>
                  <Th className="hidden sm:table-cell">Apps close</Th>
                  <Th className="hidden lg:table-cell">Biggest gap</Th>
                </tr>
              </thead>
              <tbody>
                {coverage.rows.map((row) => {
                  const status = STATUS_DISPLAY[row.status];
                  const closing = row.daysToClose !== null && row.daysToClose >= 0 && row.daysToClose <= 30;
                  return (
                    <tr key={row.target.id} className="ml-row align-top">
                      <th scope="row" className="px-3 py-3 text-left text-[16px] font-semibold text-bone">
                        {row.target.bank_name}
                      </th>
                      <td className="px-3 py-3">
                        <StatusLabel tone={status.tone}>{status.label}</StatusLabel>
                      </td>
                      <td className="ml-num px-3 py-3 text-[15px] text-bone">
                        {row.juniorCount}<span className="text-graphite">/2</span>
                      </td>
                      <td className="ml-num px-3 py-3 text-[15px] text-bone">
                        {row.seniorCount}<span className="text-graphite">/1</span>
                      </td>
                      <td className="hidden px-3 py-3 text-[14px] text-graphite md:table-cell">
                        {row.strongestStage ? STAGE_LABELS[row.strongestStage] : '—'}
                      </td>
                      <td className="ml-num hidden px-3 py-3 text-[14px] sm:table-cell">
                        {row.daysToClose === null ? (
                          <span className="text-graphite">—</span>
                        ) : row.daysToClose < 0 ? (
                          <span className="text-graphite">Closed</span>
                        ) : (
                          <span className={closing ? 'text-red' : 'text-graphite'}>
                            {row.daysToClose}d{closing ? ' · soon' : ''}
                          </span>
                        )}
                      </td>
                      <td className="hidden px-3 py-3 text-[14px] leading-snug text-graphite lg:table-cell">
                        {row.gaps[0] ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScroll>
        )}

        <p className="mt-5 max-w-[70ch] text-[15px] leading-[1.6] text-graphite">
          Close gaps from the{' '}
          <Link href={`${base}/contacts`} className="ml-btn-text">contact register</Link> — link each
          new contact to their firm so this map stays live.
        </p>
      </section>

      {/* ── Alumni intelligence ────────────────────────────────── */}
      <section>
        <SectionHeading title="Where alumni like you land" label="Aggregates only" />
        <p className="mt-3 max-w-[70ch] text-[16px] leading-[1.6] text-graphite">
          Aggregate patterns from our database of real Australian investment-banking professionals.
          {university
            ? ` Matched against ${university}.`
            : ' Complete your report so we can match your university.'}
        </p>

        {!alumni ? (
          <p className="mt-4 text-[16px] text-graphite">
            Alumni intelligence is unavailable right now — the coverage register above still works.
          </p>
        ) : (
          <>
            {university && (
              <p className="mt-5 max-w-[70ch] text-[16px] leading-[1.6] text-bone">
                {alumni.universityMatchCount > 0 ? (
                  <>
                    Professionals from your university appear{' '}
                    <span className="ml-num font-bold">{alumni.universityMatchCount}</span> time
                    {alumni.universityMatchCount === 1 ? '' : 's'} in our database
                    {alumni.topAlumniFirms.length > 0 ? (
                      <>
                        {' '}— concentrated at{' '}
                        <span className="font-bold text-bone">{alumni.topAlumniFirms.join(', ')}</span>.
                        Shared university is your strongest cold-outreach lever; start there.
                      </>
                    ) : (
                      '.'
                    )}
                  </>
                ) : (
                  'No direct alumni matches in the database yet — lean on other commonality: degree, city, societies, or shared experiences.'
                )}
              </p>
            )}

            <TableScroll className="mt-5">
              <table className="w-full min-w-[30rem] border-collapse text-left">
                <caption className="sr-only">
                  Firms in the professionals database, with how many share your university
                </caption>
                <thead>
                  <tr>
                    <Th>Firm</Th>
                    <Th>Your alumni</Th>
                    <Th>In database</Th>
                    <Th className="hidden sm:table-cell">Role mix (An/As/VP)</Th>
                    <Th className="hidden md:table-cell">Locations</Th>
                  </tr>
                </thead>
                <tbody>
                  {alumni.firms.slice(0, 12).map((firm) => (
                    <tr key={firm.firm} className="ml-row align-top">
                      <th scope="row" className="px-3 py-3 text-left text-[15px] font-semibold text-bone">
                        {firm.firm}
                      </th>
                      <td className="ml-num px-3 py-3 text-[15px]">
                        <span className={firm.alumniCount > 0 ? 'font-bold text-bone' : 'text-graphite'}>
                          {firm.alumniCount}
                        </span>
                      </td>
                      <td className="ml-num px-3 py-3 text-[15px] text-graphite">{firm.total}</td>
                      <td className="ml-num hidden px-3 py-3 text-[14px] text-graphite sm:table-cell">
                        {firm.roleMix.analyst}/{firm.roleMix.associate}/{firm.roleMix.vp}
                      </td>
                      <td className="hidden px-3 py-3 text-[14px] text-graphite md:table-cell">
                        {firm.topGeographies.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>

            <p className="mt-5 max-w-[70ch] text-[15px] leading-[1.6] text-graphite">
              We show patterns, never people — find the individuals yourself on LinkedIn, then add
              them as contacts. Firms with fewer than two professionals in the database are hidden.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
