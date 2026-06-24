import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/report/loading';

  if (!code) {
    console.error('[auth/callback] No code in URL');
    return NextResponse.redirect(`${origin}/onboard/signup?error=auth_failed`);
  }

  const cookieStore = await cookies();

  // Collect cookies to write — we apply them to the redirect response
  // so they're definitely included, regardless of Next.js version behaviour.
  const cookiesToWrite: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(incoming) {
          // Buffer them — we'll write to both the store and the response.
          incoming.forEach(({ name, value, options }) => {
            cookiesToWrite.push({ name, value, options });
            try { cookieStore.set(name, value, options); } catch { /* server component read-only ctx */ }
          });
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message);
    return NextResponse.redirect(`${origin}/onboard/signup?error=auth_failed`);
  }

  // Build the redirect and stamp all auth cookies onto it.
  const response = NextResponse.redirect(`${origin}${next}`);
  cookiesToWrite.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  });

  return response;
}
