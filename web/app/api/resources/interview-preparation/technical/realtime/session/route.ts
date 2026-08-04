import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getTechnicalApiContext,
  hasTechnicalSubscription,
  recordTechnicalEvent,
} from '@/lib/interview/server';

const SessionSchema = z.object({
  instanceId: z.string().uuid(),
  mode: z.enum(['simulation', 'coach']),
});

const REALTIME_PROVIDER_TIMEOUT_MS = 15_000;

export async function POST(request: Request) {
  const result = await getTechnicalApiContext();
  if (result.response) return result.response;
  const parsed = SessionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid realtime session request' }, { status: 400 });
  const { context } = result;
  if (!(await hasTechnicalSubscription(context))) {
    return NextResponse.json({ error: 'Live simulation access is unavailable' }, { status: 403 });
  }
  if (process.env.INTERVIEW_REALTIME_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Live simulation is not enabled in this environment' }, { status: 503 });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Realtime provider is not configured' }, { status: 503 });
  const { data: instance } = await context.service.from('technical_question_instances')
    .select('id, rendered_prompt, family_id').eq('id', parsed.data.instanceId)
    .eq('user_id', context.user.id).maybeSingle();
  if (!instance) return NextResponse.json({ error: 'Question instance not found' }, { status: 404 });

  const coachRule = parsed.data.mode === 'coach'
    ? 'After the candidate finishes each response, give at most one short cue about structure or an omitted assumption. Never reveal the answer.'
    : 'Run a realistic interview. Do not give feedback, hints, scores, praise, or corrections during the session.';
  let providerResponse: Response;
  try {
    providerResponse = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(REALTIME_PROVIDER_TIMEOUT_MS),
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: process.env.OPENAI_REALTIME_MODEL ?? 'gpt-realtime-2.1',
          output_modalities: ['audio'],
          instructions: [
            'You are an investment-banking technical interviewer.',
            'Ask the approved question exactly once, then wait for the candidate.',
            `Approved question: ${instance.rendered_prompt}`,
            coachRule,
            'Do not invent new technical questions, facts, answer keys, or bank-specific claims.',
          ].join('\n'),
          audio: {
            input: {
              turn_detection: {
                type: 'semantic_vad',
                eagerness: 'low',
                create_response: true,
                interrupt_response: true,
              },
              transcription: { model: process.env.OPENAI_REALTIME_TRANSCRIPTION_MODEL ?? 'gpt-realtime-whisper' },
            },
            output: { voice: process.env.OPENAI_REALTIME_VOICE ?? 'marin' },
          },
        },
      }),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
      return NextResponse.json({ error: 'Live simulation provider timed out' }, { status: 504 });
    }
    console.error('OpenAI realtime secret request failed:', error);
    return NextResponse.json({ error: 'Could not reach live simulation provider' }, { status: 502 });
  }
  const payload = await providerResponse.json().catch(() => null);
  if (!providerResponse.ok) {
    console.error('OpenAI realtime secret failed:', providerResponse.status, payload);
    return NextResponse.json({ error: 'Could not start live simulation' }, { status: 502 });
  }
  await recordTechnicalEvent(context, 'technical_realtime_started', {
    family_id: instance.family_id,
    mode: parsed.data.mode,
  });
  return NextResponse.json({ clientSecret: payload, mode: parsed.data.mode, retention: { rawMediaStored: false } });
}
