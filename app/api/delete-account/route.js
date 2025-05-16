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

    // Get user profile data for stripe information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile data:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile data' },
        { status: 500 }
      );
    }

    // If the user has an active subscription, cancel it
    if (profile?.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(profile.stripe_subscription_id, {
          invoice_now: true,
          prorate: true,
        });
      } catch (stripeError) {
        console.error('Error canceling subscription:', stripeError);
        // Continue with account deletion even if subscription cancellation fails
      }
    }

    // Manually delete user data in the correct order to handle foreign key constraints

    // 1. Delete program_workouts related to user's entities (no cascade)
    const { error: workoutsError } = await supabase.rpc('delete_user_data', {
      user_id: userId,
    });

    if (workoutsError) {
      console.error('Error deleting user data:', workoutsError);
      return NextResponse.json(
        { error: 'Failed to delete user data' },
        { status: 500 }
      );
    }

    // 2. Delete user from auth system (which will cascade to profiles)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Error deleting user account:', authError);
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account: ' + error.message },
      { status: 500 }
    );
  }
}
