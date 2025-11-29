import { createClient } from '../../utils/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  const requestUrl = new URL(request.url);
  const supabase = await createClient();

  await supabase.auth.signOut();

  return NextResponse.redirect(`${requestUrl.origin}/login`, {
    status: 301,
  });
}
