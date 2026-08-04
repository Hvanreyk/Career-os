import { afterEach, describe, expect, it, vi } from 'vitest';

const serverMocks = vi.hoisted(() => ({
  getTechnicalApiContext: vi.fn(),
  hasTechnicalSubscription: vi.fn(),
  recordTechnicalEvent: vi.fn(),
}));

vi.mock('@/lib/interview/server', () => serverMocks);

import { POST } from '../../web/app/api/resources/interview-preparation/technical/realtime/session/route';

const originalRealtimeFlag = process.env.INTERVIEW_REALTIME_ENABLED;
const originalApiKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  if (originalRealtimeFlag === undefined) delete process.env.INTERVIEW_REALTIME_ENABLED;
  else process.env.INTERVIEW_REALTIME_ENABLED = originalRealtimeFlag;
  if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalApiKey;
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('realtime session route', () => {
  it('rejects invalid successful provider JSON before recording a start event', async () => {
    process.env.INTERVIEW_REALTIME_ENABLED = 'true';
    process.env.OPENAI_API_KEY = 'test-key';
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue({
      data: {
        id: '10000000-0000-4000-8000-000000000001',
        family_id: '20000000-0000-4000-8000-000000000001',
        rendered_prompt: 'Walk me through enterprise value.',
      },
      error: null,
    });
    serverMocks.getTechnicalApiContext.mockResolvedValue({
      context: {
        user: { id: '30000000-0000-4000-8000-000000000001' },
        service: { from: vi.fn().mockReturnValue(query) },
      },
    });
    serverMocks.hasTechnicalSubscription.mockResolvedValue(true);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not-json', { status: 200 })));

    const response = await POST(new Request('http://localhost/api/realtime/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instanceId: '10000000-0000-4000-8000-000000000001',
        mode: 'simulation',
      }),
    }));

    expect(response.status).toBe(502);
    expect(serverMocks.recordTechnicalEvent).not.toHaveBeenCalled();
  });
});
