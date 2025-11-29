import { createMobileCompatibleClient, corsHeaders } from '@/utils/supabase/mobile';
import { stripe } from '@/utils/stripe';
import { NextResponse } from 'next/server';

export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders()
  });
}

export async function POST(request) {
  try {
    const supabase = await createMobileCompatibleClient(request);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders() }
      );
    }

    // Get the user's Stripe customer ID from the database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing information found' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Create a Stripe billing portal session
    const { url } = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
    });

    return NextResponse.json({ url }, { headers: corsHeaders() });
  } catch (error) {
    console.error('Billing portal error:', error);
    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500, headers: corsHeaders() }
    );
  }
}