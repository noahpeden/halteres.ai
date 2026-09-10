import { NextResponse } from 'next/server';
import { subscriptionsPausedPayload } from '@/utils/billing';
import { corsHeaders } from '@/utils/supabase/mobile';

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(),
  });
}

/**
 * New paid Checkout Sessions are refused while beta is free.
 * Existing-customer webhook / cancel / billing-portal routes are unchanged.
 */
export async function POST() {
  return NextResponse.json(subscriptionsPausedPayload(), {
    status: 410,
    headers: corsHeaders(),
  });
}
