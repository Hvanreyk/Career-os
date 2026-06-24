import { notFound, redirect } from 'next/navigation';
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server';
import type { ScoringOutput } from '@trajectoryos/core/scoring/types';
import type { LLMReport } from '@trajectoryos/core/llm/types';
import ReportClient from './ReportClient';
import ReportPending from './ReportPending';

interface Row {
  id: string;
  scoring_output: ScoringOutput;
  llm_report: LLMReport | null;
  has_access: boolean;
  status: string;
  error_message: string | null;
  created_at: string;
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/onboard/goal');

  const serviceClient = createServiceClient();

  const { data, error } = await serviceClient
    .from('reports')
    .select('id, scoring_output, llm_report, has_access, status, error_message, created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !data) notFound();

  const row = data as Row;
  if (!row.has_access) redirect('/pricing');

  // The LLM step runs after creation. If it hasn't finished (or failed), show a
  // gate that can (re)trigger processing instead of rendering a broken report.
  if (row.status !== 'completed' || !row.llm_report) {
    return <ReportPending id={row.id} status={row.status} errorMessage={row.error_message} />;
  }

  return <ReportClient report={row.scoring_output} llm={row.llm_report} createdAt={row.created_at} />;
}
