import { NextResponse } from 'next/server';
import { stripe } from '@/utils/stripe';
import { corsHeaders, createMobileCompatibleClient } from '@/utils/supabase/mobile';

export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(),
  });
}

export async function POST(req) {
  try {
    // Get the user's session
    const supabase = await createMobileCompatibleClient(req);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders() }
      );
    }

    const userId = user.id;

    // Fetch the user's subscription data from Supabase
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile data:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile data' },
        { status: 500, headers: corsHeaders() }
      );
    }

    // Check if the user has a subscription
    if (!profile.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Remove the cancellation schedule in Stripe
    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Subscription resumed successfully',
      },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Error resuming subscription:', error);
    return NextResponse.json(
      { error: 'Failed to resume subscription: ' + error.message },
      { status: 500, headers: corsHeaders() }
    );
  }
}
