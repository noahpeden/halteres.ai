import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Use service role key to bypass RLS for public gym lookup
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const inviteCode = searchParams.get('code');

  if (!inviteCode) {
    return NextResponse.json({ success: false, error: 'Invite code is required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('gyms')
      .select('id, name, description, logo_url')
      .eq('invite_code', inviteCode.toUpperCase())
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ success: false, error: 'Invalid invite code' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Gym lookup error:', error);
    return NextResponse.json({ success: false, error: 'Failed to find gym' }, { status: 500 });
  }
}
