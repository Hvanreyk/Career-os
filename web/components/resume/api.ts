export const RESUME_API = '/api/resources/resume-cover-letter';

/**
 * Sends a request to the resume and cover letter API.
 *
 * @param path - The API endpoint path.
 * @param method - The HTTP method.
 * @param body - Optional request payload serialized as JSON.
 * @returns The parsed response data, or `undefined` for a `204 No Content` response.
 * @throws An error containing the server message when the response is unsuccessful.
 */
export async function api<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(`${RESUME_API}${path}`, {
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
