import { createHash } from 'node:crypto';

/**
 * Key-order-independent JSON serialisation (same approach as the
 * report idempotency check in /api/generate-report) + sha256, used to
 * bound roadmap LLM cost to one generation per distinct input.
 */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

export function hashInput(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}
