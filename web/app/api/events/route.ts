import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getRequestUser } from '@/lib/auth';
import { getResourceDefinition } from '@/lib/resources/catalog';
import { createServiceClient } from '@/lib/supabase/server';

const EVENT_NAMES = [
  'resource_viewed',
  'lesson_viewed',
  'lesson_completed',
  'diagnostic_completed',
  'quiz_completed',
  'roadmap_requested',
  'roadmap_completed',
] as const;

const BodySchema = z.object({
  eventName: z.enum(EVENT_NAMES),
  resourceSlug: z.string().max(80).optional(),
  anonymousId: z.string().max(128).optional(),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
});

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    const loopback = new Set(['localhost', '127.0.0.1', '::1']);
    const sameLocalServer =
      loopback.has(originUrl.hostname) &&
      loopback.has(requestUrl.hostname) &&
      originUrl.port === requestUrl.port;
    if (originUrl.origin !== requestUrl.origin && !sameLocalServer) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
    }
  }
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
  if (parsed.data.resourceSlug && !getResourceDefinition(parsed.data.resourceSlug)) {
    return NextResponse.json({ error: 'Unknown resource' }, { status: 400 });
  }
  if (JSON.stringify(parsed.data.properties).length > 4000) {
    return NextResponse.json({ error: 'Event properties too large' }, { status: 400 });
  }

  const user = await getRequestUser();
  const service = createServiceClient();
  const { error } = await service.from('product_events').insert({
    user_id: user?.id ?? null,
    anonymous_id: parsed.data.anonymousId ?? null,
    event_name: parsed.data.eventName,
    resource_slug: parsed.data.resourceSlug ?? null,
    properties: parsed.data.properties,
  });
  if (error) {
    console.error('event insert failed:', error);
    return NextResponse.json({ error: 'Could not record event' }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
