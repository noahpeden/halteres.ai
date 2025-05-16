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
        // Continue with account deactivation even if subscription cancellation fails
      }
    }

    // Manually delete user data in the correct order to handle foreign key constraints
    let dataDeleted = false;

    try {
      // 1. Delete program_workouts related to user's entities (no cascade)
      const { error: workoutsError } = await supabase.rpc('delete_user_data', {
        p_user_id: userId,
      });

      if (workoutsError) {
        // Log the error but continue with auth user deletion
        console.error('Error deleting user data:', workoutsError);

        // For column ambiguity error, suggest fix
        if (
          workoutsError.code === '42702' &&
          workoutsError.message.includes('ambiguous')
        ) {
          console.error(
            'SQL function parameter name conflicts with column name. Please update the function.'
          );
        }
      } else {
        dataDeleted = true;
      }
    } catch (dataError) {
      console.error('Exception when deleting user data:', dataError);
      // Continue with auth user deletion
    }

    // If we couldn't delete the data with the function, try a simple direct delete of critical tables
    if (!dataDeleted) {
      try {
        // Manual deletion of program_workouts
        const { data: entities } = await supabase
          .from('entities')
          .select('id')
          .eq('user_id', userId);

        if (entities && entities.length > 0) {
          for (const entity of entities) {
            const { error: workoutsError } = await supabase
              .from('program_workouts')
              .delete()
              .eq('entity_id', entity.id);

            if (workoutsError) {
              console.error(
                'Error deleting workouts for entity:',
                entity.id,
                workoutsError
              );
            }
          }

          // Delete entities after deleting workouts
          const { error: entitiesError } = await supabase
            .from('entities')
            .delete()
            .eq('user_id', userId);

          if (entitiesError) {
            console.error('Error deleting entities:', entitiesError);
          }
        }
      } catch (manualDeleteError) {
        console.error('Exception with manual deletion:', manualDeleteError);
      }
    }

    // Update the profile to mark as inactive instead of deleting it
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', userId);

    if (profileUpdateError) {
      console.error('Error updating profile:', profileUpdateError);
    }

    // Sign the user out
    await supabase.auth.signOut();

    // Return success response
    return NextResponse.json({
      success: true,
      message:
        'Step 1 complete: Your account has been deactivated. To complete deletion and remove all your data permanently, please email noah@halteres.ai.',
    });
  } catch (error) {
    console.error('Error deactivating account:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate account: ' + error.message },
      { status: 500 }
    );
  }
}
