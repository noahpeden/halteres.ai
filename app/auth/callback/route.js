import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const isReset = requestUrl.searchParams.get('reset') === 'true';

  console.log('Auth callback received:', {
    code: code ? 'exists' : 'missing',
    isReset,
  });

  // If there's no code, redirect to login
  if (!code) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const supabase = await createClient();

  // Exchange the code for a session
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  // If there's an error, redirect to login
  if (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  // For password reset requests, redirect to reset-password page
  if (isReset) {
    console.log('Password reset flow detected, redirecting to reset-password');
    return NextResponse.redirect(
      new URL('/reset-password?auth=success', request.url)
    );
  }

  // Standard OAuth and other auth flows - redirect to dashboard
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
