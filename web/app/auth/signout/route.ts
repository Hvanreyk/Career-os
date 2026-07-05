import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST-only: sign-out mutates state, so it must not be triggerable by a GET
// (link prefetching would log users out).
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
