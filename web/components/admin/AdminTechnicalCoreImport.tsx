'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export function AdminTechnicalCoreImport() {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  async function importBundle() {
    setLoading(true); setStatus('Validating schema and 1,000 instances per variant…');
    try {
      const family = JSON.parse(value);
      const response = await fetch('/api/admin/technical-core', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import_reviewed_bundle', family }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Import failed');
      setStatus(`Published ${data.familyId}; ${data.generatedInstancesValidated} generated instances passed.`);
      setValue('');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Import failed'); }
    finally { setLoading(false); }
  }
  return (
    <div className="p-4 sm:p-5">
      <label htmlFor="family-bundle" className="ml-label block">Reviewed TechnicalItemFamily JSON</label>
      <textarea id="family-bundle" value={value} onChange={(event) => setValue(event.target.value)} className="ml-field mt-2 min-h-72 font-mono text-[13px]" placeholder="Paste the independently authored, reviewed family bundle…" />
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Button onClick={importBundle} loading={loading} disabled={!value.trim()}>Validate and publish bundle</Button>
        <p role="status" className="text-[13px] text-graphite">{status}</p>
      </div>
      <p className="mt-3 text-[12px] leading-snug text-graphite">This path refuses self-approval, missing sources, weak bank-specific claims, invalid weights, generator failures, or absent technical/realism/copyright review identities.</p>
    </div>
  );
}
