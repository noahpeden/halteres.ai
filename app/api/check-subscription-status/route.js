import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/utils/stripe';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    // Get the user's session
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the subscription ID from the query parameters
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscription_id');

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    // Get the subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Return the relevant subscription details
    return NextResponse.json({
      id: subscription.id,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_end: subscription.current_period_end,
      cancel_at: subscription.cancel_at,
      canceled_at: subscription.canceled_at,
    });
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription status: ' + error.message },
      { status: 500 }
    );
  }
}
