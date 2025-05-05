import { createClient } from '@/utils/supabase/server';
import { stripe } from '@/utils/stripe';
import { NextResponse } from 'next/server';

export async function POST(req) {
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

    const userId = session.user.id;

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
        { status: 500 }
      );
    }

    // Check if the user has a subscription
    if (!profile.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 400 }
      );
    }

    // Remove the cancellation schedule in Stripe
    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Subscription resumed successfully',
    });
  } catch (error) {
    console.error('Error resuming subscription:', error);
    return NextResponse.json(
      { error: 'Failed to resume subscription: ' + error.message },
      { status: 500 }
    );
  }
}
