const API = '/api/resources/networking-strategy';

/**
 * Client fetch helper for the networking API routes.
 *
 * @throws Error with the server-supplied message on failure
 */
export async function networkingApi<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(payload.error ?? 'Something went wrong');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
