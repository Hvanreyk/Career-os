import { redirect } from 'next/navigation';
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
