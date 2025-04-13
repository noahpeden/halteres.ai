'use server';

import { createClient } from '@/utils/supabase/server'; // Assuming you have a server client utility
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Stripe from 'stripe';

// Ensure environment variables are loaded and asserted as non-null
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePriceId = process.env.STRIPE_PRICE_ID;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'; // Fallback for local dev

if (!stripeSecretKey || !stripePriceId) {
  throw new Error("Missing required Stripe environment variables (SECRET_KEY, PRICE_ID).");
}

// Initialize Stripe
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
  typescript: true,
});

export async function createCheckoutSession(): Promise<{ error?: string; sessionId?: string; url?: string }> {
  const supabase = createClient(); // Create server-side Supabase client

  // 1. Get User
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('Error getting user or user not logged in:', userError);
    // Redirect to login if not authenticated - adjust as needed
    return redirect('/login?message=Authentication required to subscribe.');
  }

  // 2. Get or Create Stripe Customer
  let stripeCustomerId: string | undefined;
  let profileError: any; // Define profileError here

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    profileError = error; // Assign error to the outer scope variable

    if (profile?.stripe_customer_id) {
      stripeCustomerId = profile.stripe_customer_id;
      console.log(`Found existing Stripe customer ID: ${stripeCustomerId} for user ${user.id}`);
    } else {
      // Create a new Stripe customer
      console.log(`Creating new Stripe customer for user ${user.id}`);
      const customer = await stripe.customers.create({
        email: user.email,
        // You can add more details like name if available and needed
        metadata: {
          supabaseUserId: user.id, // Link Stripe customer to Supabase user
        },
      });
      stripeCustomerId = customer.id;

      // Update the profile table with the new Stripe customer ID
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id);

      if (updateError) {
        console.error(`Failed to update profile with Stripe customer ID for user ${user.id}:`, updateError);
        // Decide how critical this is. Maybe proceed but log error?
        // For now, let's return an error.
        return { error: 'Failed to link Stripe customer to your profile. Please try again.' };
      }
      console.log(`Successfully created and linked Stripe customer ID: ${stripeCustomerId} for user ${user.id}`);
    }
  } catch (err: any) {
    console.error('Error retrieving/creating Stripe customer or updating profile:', err);
    // Include profileError details if it exists
    const errorMessage = profileError ? `Supabase profile error: ${profileError.message}. ` : '';
    return { error: `An error occurred while setting up your subscription: ${errorMessage}${err.message}` };
  }


  if (!stripeCustomerId) {
    // This should ideally not happen if logic above is correct
    return { error: 'Could not retrieve or create Stripe customer ID.' };
  }

  // 3. Create Stripe Checkout Session
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      // Important: Pass Supabase User ID in metadata for webhook handling
      metadata: {
        supabaseUserId: user.id,
      },
      // Define success and cancel URLs
      success_url: `${appUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`, // Redirect back to dashboard on success
      cancel_url: `${appUrl}/dashboard?subscription_cancelled=true`,      // Redirect back to dashboard on cancellation
      // You can enable promotions, tax collection etc. here if needed
      // allow_promotion_codes: true,
      // automatic_tax: { enabled: true },
    });

    if (!session.url) {
        console.error('Stripe Checkout Session created but missing URL.');
        return { error: 'Could not create checkout session URL.' };
    }

    // Return the session URL for redirection
    console.log(`Created Stripe Checkout session ${session.id} for user ${user.id}`);
    return { url: session.url };

  } catch (error: any) {
    console.error('Error creating Stripe checkout session:', error);
    return { error: `Failed to create subscription session: ${error.message}` };
  }
}

// Optional: Action to create a Customer Portal session
export async function createCustomerPortalSession(): Promise<{ error?: string; url?: string }> {
    const supabase = createClient();

    // 1. Get User
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        console.error('User not logged in for portal access:', userError);
        return redirect('/login?message=Authentication required to manage subscription.');
    }

    // 2. Get Stripe Customer ID from profile
    let stripeCustomerId: string | undefined;
    try {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('stripe_customer_id')
            .eq('id', user.id)
            .single();

        if (profileError || !profile?.stripe_customer_id) {
            console.error(`Could not find Stripe customer ID for user ${user.id}:`, profileError);
            return { error: 'Could not find your subscription details.' };
        }
        stripeCustomerId = profile.stripe_customer_id;
    } catch (err: any) {
        console.error('Error retrieving profile for portal access:', err);
        return { error: 'An error occurred while accessing your subscription details.' };
    }

    // 3. Create Customer Portal Session
    try {
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: `${appUrl}/dashboard`, // Where to return after portal interaction
        });

        if (!portalSession.url) {
            console.error('Stripe Portal Session created but missing URL.');
            return { error: 'Could not create portal session URL.' };
        }

        return { url: portalSession.url };

    } catch (error: any) {
        console.error('Error creating Stripe portal session:', error);
        return { error: `Failed to create portal session: ${error.message}` };
    }
}

// --- New Action: Get User Subscription Profile ---
export async function getUserSubscriptionProfile(): Promise<{
    error?: string;
    subscriptionStatus?: string | null;
    freeGenerationsUsed?: number | null;
}> {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        console.error('Error getting user for profile fetch:', userError);
        return { error: 'Authentication required.' };
    }

    try {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('subscription_status, free_generations_used')
            .eq('id', user.id)
            .single();

        if (profileError) {
            // Handle case where profile might not exist yet (should be created by trigger)
            if (profileError.code === 'PGRST116') { // code for 'Resource Not Found'
                console.warn(`Profile not found for user ${user.id}. Assuming default free tier.`);
                return { subscriptionStatus: 'free', freeGenerationsUsed: 0 };
            }
            console.error(`Error fetching profile for user ${user.id}:`, profileError);
            return { error: `Failed to fetch subscription details: ${profileError.message}` };
        }

        return {
            subscriptionStatus: profile.subscription_status,
            freeGenerationsUsed: profile.free_generations_used,
        };

    } catch (err: any) {
        console.error('Unexpected error fetching subscription profile:', err);
        return { error: `An unexpected error occurred: ${err.message}` };
    }
}

// --- New Action: Increment Free Generations Used ---
export async function incrementFreeGenerations(): Promise<{ error?: string; success?: boolean; newCount?: number }> {
    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        console.error('Error getting user for incrementing usage:', userError);
        return { error: 'Authentication required.' };
    }

    try {
         // Use Supabase edge function 'increment_free_generations' which handles fetching current value and incrementing atomically
        const { data, error } = await supabase.rpc('increment_column', {
          table_name: 'profiles',
          column_name: 'free_generations_used',
          row_id: user.id
        });

        if (error) {
            console.error(`Error incrementing free generations for user ${user.id}:`, error);
            return { error: `Failed to update usage count: ${error.message}` };
        }

        console.log(`Incremented free generations for user ${user.id}. New count (from RPC): ${data}`);
        // Note: The specific return value 'data' from rpc depends on the function definition.
        // If it returns the new value, we can use it. Otherwise, just confirm success.
        return { success: true, newCount: typeof data === 'number' ? data : undefined };

    } catch (err: any) {
        console.error('Unexpected error incrementing free generations:', err);
        return { error: `An unexpected error occurred: ${err.message}` };
    }
}
