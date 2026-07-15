import { NextResponse } from 'next/server';
import { z } from 'zod';
import { buildImportPreview } from '@trajectoryos/core/networking';
import { getNetworkingApiContext } from '@/lib/networking/server';

const BodySchema = z.object({ csv: z.string().min(1).max(2_000_000) });

/**
 * Generates a non-persistent preview of a networking CSV import.
 *
 * The preview includes header mapping, row validation, and duplicate classification.
 * Invalid input produces a 400 response; parsing failures produce a 422 response.
 *
 * @returns An HTTP response containing the import preview or an error message.
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

  try {
    const preview = buildImportPreview(parsed.data.csv, existing ?? []);
    return NextResponse.json({ preview });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not parse the file' },
      { status: 422 },
    );
  }
}
