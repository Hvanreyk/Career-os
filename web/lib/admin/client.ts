export async function submitAdminContent(body: Record<string, unknown>) {
  const response = await fetch('/api/admin/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = (await response.json().catch(() => null)) as
    | { error?: string; id?: string; revision?: number; existing?: boolean }
    | null;
  if (!response.ok) throw new Error(result?.error ?? 'Content change failed');
  return result ?? {};
}

