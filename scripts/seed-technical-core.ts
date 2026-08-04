import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  TECHNICAL_CONCEPTS,
  validateConceptTaxonomy,
} from '../lib/interview/taxonomy';

const dryRun = process.argv.includes('--dry-run');
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const taxonomyErrors = validateConceptTaxonomy();
if (taxonomyErrors.length) throw new Error(`Invalid technical taxonomy:\n${taxonomyErrors.join('\n')}`);

const conceptRows = TECHNICAL_CONCEPTS.map((concept) => ({
  id: concept.id,
  slug: concept.slug,
  topic: concept.topic,
  name: concept.name,
  sort_order: concept.sortOrder,
  status: 'active',
}));
const edgeRows = TECHNICAL_CONCEPTS.flatMap((concept) => concept.prerequisiteIds.map((prerequisite) => ({
  concept_id: concept.id,
  prerequisite_concept_id: prerequisite,
})));
const misconceptionRows = TECHNICAL_CONCEPTS.map((concept) => ({
  code: concept.primaryMisconceptionCode,
  concept_id: concept.id,
  title: concept.primaryMisconceptionCode.split('.')[1]!.toLowerCase().replaceAll('_', ' '),
  explanation: `Primary reviewed misconception definition for ${concept.name}. Complete the content review before publishing families that use this code.`,
  severity: 'fatal',
  trigger_definition: { status: 'requires_expert_definition' },
  mastery_blocking: true,
  status: 'active',
}));

async function main() {
  if (dryRun) {
    console.log(JSON.stringify({
      concepts: conceptRows.length,
      prerequisiteEdges: edgeRows.length,
      primaryMisconceptions: misconceptionRows.length,
    }, null, 2));
    return;
  }

  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error: conceptError } = await supabase.from('technical_concepts').upsert(conceptRows, { onConflict: 'id' });
  if (conceptError) throw new Error(`Could not seed concepts: ${conceptError.message}`);
  const { error: edgeError } = await supabase.from('technical_concept_edges').upsert(edgeRows, {
    onConflict: 'concept_id,prerequisite_concept_id',
  });
  if (edgeError) throw new Error(`Could not seed prerequisite edges: ${edgeError.message}`);
  const { error: misconceptionError } = await supabase.from('technical_misconceptions').upsert(misconceptionRows, { onConflict: 'code' });
  if (misconceptionError) throw new Error(`Could not seed misconceptions: ${misconceptionError.message}`);
  console.log(`Seeded ${conceptRows.length} concepts, ${edgeRows.length} prerequisite edges and ${misconceptionRows.length} primary misconception records.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
