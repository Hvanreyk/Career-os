import { notFound, redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/**
 * Server-component auth guard for routes the proxy's prefix list can't
 * cover (e.g. gated pages nested under the public /resources subtree).
 * Redirects anonymous visitors to login and back again after sign-in.
 */
export async function requireUser(nextPath: string): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/**
 * Admin authorization is carried in Supabase app_metadata, which is signed by
 * Supabase and cannot be edited by the user. Supported shapes:
 *   { role: 'admin' }
 *   { roles: ['admin'] }
 */
export function isAdminUser(user: User): boolean {
  const role = user.app_metadata?.role;
  const roles = user.app_metadata?.roles;
  return role === 'admin' || (Array.isArray(roles) && roles.includes('admin'));
}

/** Secure page-level admin check, kept close to the protected data source. */
export async function requireAdmin(nextPath = '/admin/resources'): Promise<User> {
  const user = await requireUser(nextPath);
  if (!isAdminUser(user)) notFound();
  return user;
}

/** Route Handlers use this to return 401/403 instead of redirecting. */
export async function getRequestUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
