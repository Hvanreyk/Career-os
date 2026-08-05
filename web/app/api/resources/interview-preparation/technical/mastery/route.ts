import { NextResponse } from 'next/server';
import { getTechnicalApiContext } from '@/lib/interview/server';

export async function GET() {
  const result = await getTechnicalApiContext();
  if (result.response) return result.response;
  const { data, error } = await result.context.service.from('technical_concept_mastery')
    .select('concept_id, mastery_label, evidence_confidence, useful_attempts, correct_attempts, variant_count, unresolved_fatal_misconceptions, last_assessed_at')
    .eq('user_id', result.context.user.id).order('concept_id');
  if (error) return NextResponse.json({ error: 'Could not load mastery evidence' }, { status: 500 });
  return NextResponse.json({ mastery: data ?? [], benchmarking: { percentilesEnabled: false, reason: 'Minimum cohort and outcome thresholds have not been reached.' } });
}
