const API = '/api/resources/networking-strategy';

/**
 * Sends a request to a networking API route.
 *
 * @param path - The API route path appended to the networking API base URL
 * @param method - The HTTP method for the request
 * @param body - The optional request payload, serialized as JSON
 * @returns The parsed response data, or `undefined` for a 204 response
 * @throws An error containing the server-supplied message when the request fails
 */
export async function networkingApi<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string; resetsAt?: string };
    const reset = payload.resetsAt
      ? ` Resets ${new Date(payload.resetsAt).toLocaleString('en-AU')}.`
      : '';
    throw new Error(`${payload.error ?? 'Something went wrong'}${reset}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
