import { createClient } from '../../utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const requestUrl = new URL(request.url);
  const formData = await request.formData();
  const email = formData.get('email');
  const password = formData.get('password');
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.redirect(
      `${requestUrl.origin}/login?error=Could not authenticate user`,
      {
        status: 301,
      }
    );
  }

  return NextResponse.redirect(`${requestUrl.origin}/dashboard`, {
    status: 301,
  });
}
