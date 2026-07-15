import { NextResponse } from 'next/server';
import { z } from 'zod';
import { buildImportPreview } from '@trajectoryos/core/networking';
import {
  getNetworkingApiContext,
  recordNetworkingEvent,
} from '@/lib/networking/server';

const BodySchema = z.object({ csv: z.string().min(1).max(2_000_000) });

/**
 * Commits valid CSV networking contacts for the authenticated user.
 *
 * @returns A response containing import, duplicate, and row error counts, or an error response when validation, parsing, or insertion fails.
 */
export async function POST(request: Request) {
  const result = await getNetworkingApiContext();
  if (result.response) return result.response;
  const { context } = result;

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Provide the CSV file contents' }, { status: 400 });

  const { data: existing } = await context.service
    .from('networking_contacts')
    .select('id, email_normalized, linkedin_normalized, full_name, firm')
    .eq('user_id', context.user.id);

  let preview;
  try {
    preview = buildImportPreview(parsed.data.csv, existing ?? []);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not parse the file' },
      { status: 422 },
    );
  }
  if (preview.candidates.length === 0) {
    return NextResponse.json({ error: 'No importable rows', preview }, { status: 422 });
  }

  const rows = preview.candidates.map((candidate) => ({
    user_id: context.user.id,
    full_name: candidate.full_name,
    firm: candidate.firm,
    role_title: candidate.role_title,
    seniority: candidate.seniority,
    city: candidate.city,
    email: candidate.email,
    email_normalized: candidate.email_normalized,
    linkedin_url: candidate.linkedin_url,
    linkedin_normalized: candidate.linkedin_normalized,
    tags: candidate.tags,
    notes: candidate.notes,
    source: 'imported',
  }));
  const { data: inserted, error } = await context.service
    .from('networking_contacts')
    .insert(rows)
    .select('id');
  if (error) {
    return NextResponse.json({ error: 'The import could not be committed; no rows were saved' }, { status: 500 });
  }

  await recordNetworkingEvent(context, 'networking_contacts_imported', {
    imported: inserted?.length ?? 0,
    duplicates_skipped: preview.duplicates.length,
    row_errors: preview.errors.length,
  });
  return NextResponse.json({
    imported: inserted?.length ?? 0,
    duplicates: preview.duplicates.length,
    errors: preview.errors.length,
  }, { status: 201 });
}
