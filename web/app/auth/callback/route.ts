import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Only allow same-site relative redirect targets.
function safeNext(next: string | null, fallback: string): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return fallback;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Older/customised Supabase email templates link straight here with a
  // token_hash instead of going through the PKCE code exchange.
  const tokenHash = searchParams.get('token_hash');
  const otpType = searchParams.get('type') as EmailOtpType | null;
  const next = safeNext(searchParams.get('next'), '/dashboard');

  if (!code && !(tokenHash && otpType)) {
    console.error('[auth/callback] No code or token_hash in URL');
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
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

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ type: otpType!, token_hash: tokenHash! });

  if (error) {
    console.error('[auth/callback] session exchange error:', error.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Build the redirect and stamp all auth cookies onto it.
  const response = NextResponse.redirect(`${origin}${next}`);
  cookiesToWrite.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  });

  return response;
}
