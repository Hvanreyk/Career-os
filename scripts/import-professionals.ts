/**
 * Canonical normalized-professional importer.
 *
 * Usage:
 *   npm run professionals:import -- --file ./professionals.xlsx --dry-run
 *   npm run professionals:import -- --file ./professionals.xlsx
 *   npm run professionals:import -- --file ./legacy.xlsx --legacy
 */

import { createHash } from 'node:crypto';
import { basename, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import * as XLSX from 'xlsx';

import {
  parseLegacyFlatProfessionalRows,
  parseProfessionalWorkbook,
  type ProfessionalImportBatch,
  type ProfessionalImportStagingRow,
  type RawWorkbookRow,
} from '../lib/professionals/index.js';

loadEnv();

const STAGING_CHUNK_SIZE = 500;

interface CliOptions {
  file: string;
  dryRun: boolean;
  legacy: boolean;
}

function parseArgs(argv: readonly string[]): CliOptions {
  let file = process.env.PROFESSIONALS_WORKBOOK_PATH;
  let dryRun = false;
  let legacy = false;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]!;
    if (argument === '--dry-run') {
      dryRun = true;
    } else if (argument === '--legacy') {
      legacy = true;
    } else if (argument === '--file') {
      file = argv[index + 1];
      index += 1;
    } else if (argument.startsWith('--file=')) {
      file = argument.slice('--file='.length);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (!file) {
    throw new Error('--file or PROFESSIONALS_WORKBOOK_PATH is required');
  }
  return { file: resolve(file), dryRun, legacy };
}

function legacyRows(buffer: Uint8Array): RawWorkbookRow[] {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const sheetName = workbook.SheetNames.find(
    (name) => name.trim().toLowerCase() === 'professionals',
  );
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) throw new Error("Legacy workbook sheet 'professionals' is required");
  return XLSX.utils.sheet_to_json<RawWorkbookRow>(sheet, {
    raw: false,
    defval: null,
    blankrows: false,
  });
}

function parseBatch(buffer: Uint8Array, legacy: boolean): ProfessionalImportBatch {
  return legacy
    ? parseLegacyFlatProfessionalRows(legacyRows(buffer))
    : parseProfessionalWorkbook(buffer);
}

function printBatch(batch: ProfessionalImportBatch): void {
  console.log(JSON.stringify(batch.summary, null, 2));
  if (batch.issues.length === 0) return;

  console.log('\nIssues:');
  for (const issue of batch.issues) {
    const location = [
      issue.sheet,
      issue.row === null ? null : `row ${issue.row}`,
      issue.column,
      issue.professional_key,
    ].filter(Boolean).join(' / ');
    console.log(`- ${issue.severity.toUpperCase()} ${location}: ${issue.message}`);
  }
}

function stableKey(row: ProfessionalImportStagingRow): string {
  if (row.sheet_name === 'professionals') return row.professional_key;
  const sequence = row.payload.sequence;
  return `${row.professional_key}:${typeof sequence === 'number' ? sequence : row.source_row}`;
}

async function findOrCreateBatch(
  client: SupabaseClient,
  sourceFilename: string,
  sourceHash: string,
): Promise<{ batchId: string; alreadyComplete: boolean }> {
  const { data: existing, error: existingError } = await client
    .from('professional_import_batches')
    .select('batch_id, status')
    .eq('source_hash', sourceHash)
    .maybeSingle();
  if (existingError) throw new Error('Unable to check existing import batches');
  if (existing?.status === 'complete') {
    return { batchId: String(existing.batch_id), alreadyComplete: true };
  }

  if (existing) {
    const batchId = String(existing.batch_id);
    const { error: deleteError } = await client
      .from('professional_import_staging_rows')
      .delete()
      .eq('batch_id', batchId);
    if (deleteError) throw new Error('Unable to clear a previous failed staging batch');
    const { error: resetError } = await client
      .from('professional_import_batches')
      .update({
        status: 'staged',
        error_summary: [],
        inserted_count: 0,
        updated_count: 0,
        unchanged_count: 0,
        draft_count: 0,
        rejected_count: 0,
        completed_at: null,
      })
      .eq('batch_id', batchId);
    if (resetError) throw new Error('Unable to reset a previous failed import batch');
    return { batchId, alreadyComplete: false };
  }

  const { data, error } = await client
    .from('professional_import_batches')
    .insert({
      source_filename: sourceFilename,
      source_hash: sourceHash,
      status: 'staged',
    })
    .select('batch_id')
    .single();
  if (error || !data) throw new Error('Unable to create professional import batch');
  return { batchId: String(data.batch_id), alreadyComplete: false };
}

async function stageRows(
  client: SupabaseClient,
  batchId: string,
  rows: readonly ProfessionalImportStagingRow[],
): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += STAGING_CHUNK_SIZE) {
    const chunk = rows.slice(offset, offset + STAGING_CHUNK_SIZE).map((row) => ({
      batch_id: batchId,
      sheet_name: row.sheet_name,
      row_number: row.source_row,
      professional_key: row.professional_key,
      stable_key: stableKey(row),
      payload: row.payload,
      validation_status: 'valid',
      validation_errors: [],
    }));
    const { error } = await client
      .from('professional_import_staging_rows')
      .insert(chunk);
    if (error) throw new Error(`Unable to stage rows at offset ${offset}`);
  }
}

async function applyBatch(
  client: SupabaseClient,
  batchId: string,
  batch: ProfessionalImportBatch,
): Promise<void> {
  await stageRows(client, batchId, batch.staging_rows);
  const { error: validateError } = await client
    .from('professional_import_batches')
    .update({ status: 'validated' })
    .eq('batch_id', batchId);
  if (validateError) throw new Error('Unable to mark import batch as validated');

  const { data: readiness, error: applyError } = await client
    .rpc('apply_professional_import_batch', { p_batch_id: batchId });
  if (applyError) throw new Error('Normalized professional import transaction failed');

  const { data: applied, error: batchError } = await client
    .from('professional_import_batches')
    .select(
      'status, inserted_count, updated_count, unchanged_count, draft_count, rejected_count',
    )
    .eq('batch_id', batchId)
    .single();
  if (batchError || !applied || applied.status !== 'complete') {
    throw new Error('Import transaction did not complete');
  }

  const ready = Array.isArray(readiness)
    ? readiness.filter((row) => row.lifecycle_status === 'ready').length
    : 0;
  console.log('\nApplied batch:');
  console.log(JSON.stringify({ batch_id: batchId, ...applied, ready_count: ready }, null, 2));
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const buffer = readFileSync(options.file);
  const batch = parseBatch(buffer, options.legacy);

  console.log(`Source: ${options.file}`);
  console.log(`Format: ${options.legacy ? 'legacy flat workbook' : 'canonical workbook'}`);
  printBatch(batch);

  if (!batch.can_apply) {
    throw new Error('Import validation failed; no database writes were attempted');
  }
  if (options.dryRun) {
    console.log('\nDry run complete; no database writes were attempted.');
    return;
  }

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  const sourceHash = createHash('sha256').update(buffer).digest('hex');
  const client = createClient(url, key, { auth: { persistSession: false } });
  const importBatch = await findOrCreateBatch(client, basename(options.file), sourceHash);
  if (importBatch.alreadyComplete) {
    console.log(`\nBatch ${importBatch.batchId} already completed; no rows were duplicated.`);
    return;
  }

  await applyBatch(client, importBatch.batchId, batch);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Professional import failed');
  process.exitCode = 1;
});
