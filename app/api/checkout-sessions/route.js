import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { stripe } from '@/utils/stripe';

// Verify we're using test keys
const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_');
const isPublishableKeyTestMode =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_');

if (!isTestMode || !isPublishableKeyTestMode) {
  console.error(`
⚠️ MODE MISMATCH DETECTED ⚠️
Secret key is in ${isTestMode ? 'TEST' : 'LIVE'} mode
Publishable key is in ${isPublishableKeyTestMode ? 'TEST' : 'LIVE'} mode
Make sure both keys are in TEST mode for local development.
  `);
}

// Supabase admin client (service role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

export async function POST(req) {
  console.log('checkout-sessions route', process.env.STRIPE_SECRET_KEY);
  try {
    const { priceId } = await req.json();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    // Use Supabase SSR helper to get the user from cookies (server context)
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Error getting user from Supabase:', userError);
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Fetch the profile for this user
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Error fetching user profile' },
        { status: 404 }
      );
    }

    console.log('Found user profile:', {
      id: profile.id,
      subscription_status: profile.subscription_status,
      stripe_customer_id: profile.stripe_customer_id,
    });

    // Get or create Stripe customer
    let stripeCustomerId = profile.stripe_customer_id;
    if (!stripeCustomerId) {
      // Get user's email from Supabase auth
      const { data: authUser, error: authError } =
        await supabaseAdmin.auth.admin.getUserById(profile.id);
      const userEmail = authUser?.user?.email || 'test@example.com';
      if (authError) {
        console.error('Error getting user email:', authError);
      }
      try {
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: { supabaseUserId: profile.id },
        });
        stripeCustomerId = customer.id;
        // Update profile with new customer ID
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', profile.id);
        if (updateError) {
          console.error(
            'Failed to update profile with Stripe customer ID:',
            updateError
          );
        }
      } catch (stripeError) {
        console.error('Stripe customer creation error:', stripeError);
        return NextResponse.json(
          { error: `Stripe error: ${stripeError.message}` },
          { status: stripeError.statusCode || 500 }
        );
      }
    }

    // Create Stripe checkout session
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        customer: stripeCustomerId,
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        success_url: `${siteUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/pricing?checkout=cancelled`,
        client_reference_id: profile.id,
        metadata: { supabaseUserId: profile.id },
      });
      return NextResponse.json({ sessionId: session.id });
    } catch (stripeError) {
      console.error('Stripe checkout session creation error:', stripeError);
      return NextResponse.json(
        { error: `Stripe session error: ${stripeError.message}` },
        { status: stripeError.statusCode || 500 }
      );
    }
  } catch (error) {
    console.error('General error in checkout API:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
