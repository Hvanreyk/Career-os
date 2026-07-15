'use client';

import Link from 'next/link';
import type { AlumniIntel, CoverageSummary, CoverageStatus } from '@trajectoryos/core/networking';
import { STAGE_LABELS } from '@trajectoryos/core/networking';

const STATUS_STYLES: Record<CoverageStatus, { label: string; classes: string }> = {
  none: { label: 'No coverage', classes: 'text-red-400 border-red-400/30 bg-red-400/10' },
  thin: { label: 'Thin', classes: 'text-amber-300 border-amber-300/30 bg-amber-300/10' },
  building: { label: 'Building', classes: 'text-sky-300 border-sky-300/30 bg-sky-300/10' },
  covered: { label: 'Covered', classes: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
};

interface Props {
  base: string;
  coverage: CoverageSummary;
  alumni: AlumniIntel | null;
  university: string;
}

/**
 * Displays target-firm coverage and aggregated alumni placement patterns.
 *
 * @param base - Base URL used to build the contacts page link
 * @param coverage - Per-firm coverage data
 * @param alumni - Aggregated alumni intelligence, or `null` when unavailable
 * @param university - University used to match alumni records
 */
export function TargetMapView({ base, coverage, alumni, university }: Props) {
  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl border border-white/8 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
          <h2 className="text-white font-semibold">Coverage by target firm</h2>
          <p className="text-xs text-slate-500">
            Goal per firm: 2 junior contacts (analyst/associate) + 1 senior (VP or above)
          </p>
        </div>
        {coverage.rows.length === 0 ? (
          <p className="text-sm text-slate-500 mt-3">Add bank targets to see coverage.</p>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-white/5">
                  <th className="py-2.5 pr-4 font-medium">Firm</th>
                  <th className="py-2.5 pr-4 font-medium">Coverage</th>
                  <th className="py-2.5 pr-4 font-medium">Junior</th>
                  <th className="py-2.5 pr-4 font-medium">Senior</th>
                  <th className="py-2.5 pr-4 font-medium hidden md:table-cell">Deepest stage</th>
                  <th className="py-2.5 pr-4 font-medium hidden sm:table-cell">Apps close</th>
                  <th className="py-2.5 font-medium hidden lg:table-cell">Biggest gap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {coverage.rows.map((row) => {
                  const status = STATUS_STYLES[row.status];
                  return (
                    <tr key={row.target.id}>
                      <td className="py-3 pr-4 text-white font-medium">{row.target.bank_name}</td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${status.classes}`}>{status.label}</span>
                      </td>
                      <td className="py-3 pr-4 text-slate-300">{row.juniorCount}<span className="text-slate-600">/2</span></td>
                      <td className="py-3 pr-4 text-slate-300">{row.seniorCount}<span className="text-slate-600">/1</span></td>
                      <td className="py-3 pr-4 text-xs text-slate-400 hidden md:table-cell">
                        {row.strongestStage ? STAGE_LABELS[row.strongestStage] : '—'}
                      </td>
                      <td className="py-3 pr-4 text-xs hidden sm:table-cell">
                        {row.daysToClose === null
                          ? <span className="text-slate-600">—</span>
                          : row.daysToClose < 0
                            ? <span className="text-slate-600">closed</span>
                            : <span className={row.daysToClose <= 30 ? 'text-red-400' : 'text-slate-400'}>{row.daysToClose}d</span>}
                      </td>
                      <td className="py-3 text-xs text-slate-500 hidden lg:table-cell">{row.gaps[0] ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-slate-600 mt-4">
          Close gaps from the <Link href={`${base}/contacts`} className="text-gold-400 hover:underline">contacts</Link> page —
          link each new contact to their firm so this map stays live.
        </p>
      </div>

      <div className="glass rounded-2xl border border-white/8 p-6">
        <h2 className="text-white font-semibold mb-1">Where alumni like you land</h2>
        <p className="text-xs text-slate-500 mb-4">
          Aggregate patterns from our database of real AU investment-banking professionals.
          {university ? ` Matched against ${university}.` : ' Complete your report so we can match your university.'}
        </p>
        {!alumni ? (
          <p className="text-sm text-slate-500">Alumni intelligence is unavailable right now — the coverage grid above still works.</p>
        ) : (
          <>
            {university && (
              <p className="text-sm text-slate-300 mb-4">
                {alumni.universityMatchCount > 0
                  ? <>Professionals from your university appear <strong className="text-white">{alumni.universityMatchCount}</strong> time{alumni.universityMatchCount === 1 ? '' : 's'} in our database{alumni.topAlumniFirms.length > 0 ? <> — concentrated at <strong className="text-gold-400">{alumni.topAlumniFirms.join(', ')}</strong>. Shared university is your strongest cold-outreach lever; start there.</> : '.'}</>
                  : 'No direct alumni matches in the database yet — lean on other commonality: degree, city, societies, or shared experiences.'}
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-white/5">
                    <th className="py-2.5 pr-4 font-medium">Firm</th>
                    <th className="py-2.5 pr-4 font-medium">Your alumni</th>
                    <th className="py-2.5 pr-4 font-medium">In database</th>
                    <th className="py-2.5 pr-4 font-medium hidden sm:table-cell">Role mix (An/As/VP)</th>
                    <th className="py-2.5 font-medium hidden md:table-cell">Locations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {alumni.firms.slice(0, 12).map((firm) => (
                    <tr key={firm.firm}>
                      <td className="py-3 pr-4 text-white">{firm.firm}</td>
                      <td className="py-3 pr-4">
                        {firm.alumniCount > 0
                          ? <span className="text-gold-400 font-medium">{firm.alumniCount}</span>
                          : <span className="text-slate-600">0</span>}
                      </td>
                      <td className="py-3 pr-4 text-slate-400">{firm.total}</td>
                      <td className="py-3 pr-4 text-xs text-slate-400 hidden sm:table-cell">
                        {firm.roleMix.analyst}/{firm.roleMix.associate}/{firm.roleMix.vp}
                      </td>
                      <td className="py-3 text-xs text-slate-500 hidden md:table-cell">{firm.topGeographies.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-600 mt-4">
              We show patterns, never people — find the individuals yourself on LinkedIn, then add them as contacts.
              Firms with fewer than 2 professionals in the database are hidden.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
