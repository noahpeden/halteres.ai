import { NextResponse } from 'next/server';
import { stripe } from '@/utils/stripe';
import { corsHeaders, createMobileCompatibleClient } from '@/utils/supabase/mobile';

export async function OPTIONS(req) {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders(),
  });
}

export async function GET(request) {
  try {
    // Get the user's session
    const supabase = await createMobileCompatibleClient(request);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: corsHeaders() }
      );
    }

    // Get the subscription ID from the query parameters
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscription_id');

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Get the subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Return the relevant subscription details
    return NextResponse.json(
      {
        id: subscription.id,
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        current_period_end: subscription.current_period_end,
        cancel_at: subscription.cancel_at,
        canceled_at: subscription.canceled_at,
      },
      { headers: corsHeaders() }
    );
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription status: ' + error.message },
      { status: 500, headers: corsHeaders() }
    );
  }
}
