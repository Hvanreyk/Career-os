import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { validateGeneratedFamily } from '@trajectoryos/core/interview/generator';
import { TechnicalItemFamilySchema } from '@trajectoryos/core/interview/types';
import { getRequestUser, isAdminUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

function hash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export async function POST(request: Request) {
  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (!isAdminUser(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json().catch(() => null) as { action?: unknown; family?: unknown } | null;
  if (body?.action !== 'import_reviewed_bundle') {
    return NextResponse.json({ error: 'Invalid technical-core action' }, { status: 400 });
  }
  const familyResult = TechnicalItemFamilySchema.safeParse(body.family);
  if (!familyResult.success) {
    return NextResponse.json({ error: 'Invalid reviewed family bundle', issues: familyResult.error.flatten() }, { status: 400 });
  }
  const family = familyResult.data;
  const generatorErrors = validateGeneratedFamily(family, 1000);
  if (generatorErrors.length) {
    return NextResponse.json({ error: 'Generator property tests failed', generatorErrors }, { status: 422 });
  }

  const service = createServiceClient();
  const { data: concept } = await service.from('technical_concepts')
    .select('id, topic').eq('id', family.primaryConceptId).maybeSingle();
  if (!concept || concept.topic !== family.topic) {
    return NextResponse.json({ error: 'Primary concept/topic mismatch' }, { status: 422 });
  }
  const { data: existing } = await service.from('technical_item_families')
    .select('id, status').eq('slug', family.slug).maybeSingle();
  if (existing) {
    return NextResponse.json({
      error: `Family already exists with status ${existing.status}; create a new immutable version through adjudication.`,
    }, { status: 409 });
  }

  const validationInstanceCount = 1000 * family.variantCoverage.length;
  const { error } = await service.rpc('technical_import_reviewed_family', {
    p_family: family,
    p_actor_user_id: user.id,
    p_question_hash: hash(family.questionVersion),
    p_rubric_hash: hash(family.rubricVersion),
    p_parameter_hash: hash(family.parameterSpec),
    p_validation_instance_count: validationInstanceCount,
  });
  if (error) {
    console.error('Atomic technical family import failed:', error.message);
    return NextResponse.json({ error: `Reviewed family import failed: ${error.message}` }, { status: 422 });
  }

  return NextResponse.json({
    familyId: family.id,
    status: 'published',
    generatedInstancesValidated: validationInstanceCount,
  }, { status: 201 });
}
