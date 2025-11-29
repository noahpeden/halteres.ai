import { NextResponse } from 'next/server';
import { createMobileCompatibleClient, corsHeaders } from '@/utils/supabase/mobile';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { stripe } from '@/utils/stripe';

export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders()
  });
}

export async function POST(req) {
  const supabase = await createMobileCompatibleClient(req);

  try {
    const { priceId } = await req.json();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!priceId) {
      return new NextResponse(
        JSON.stringify({ error: 'Price ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders() },
        }
      );
    }
    if (!siteUrl) {
      console.error('Missing NEXT_PUBLIC_SITE_URL environment variable');
      return new NextResponse(
        JSON.stringify({ error: 'Internal server configuration error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders() },
        }
      );
    }

    // 1. Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('API Authentication Error:', authError?.message);
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      });
    }

    // 2. Check for existing active subscription
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('subscription_status, stripe_subscription_id')
      .eq('id', user.id)
      .single();

    if (!checkError && existingProfile) {
      // Block subscription creation if user already has active subscription
      if (existingProfile.subscription_status === 'active') {
        return new NextResponse(
          JSON.stringify({
            error: 'You already have an active subscription. Please manage your subscription from your profile page.'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders() },
          }
        );
      }
    }

    // 3. Fetch user profile to get/create stripe_customer_id
    // Use service role key for backend operations
    const cookieStore = await cookies();
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY, // Use Service Role Key here
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name, options) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id) // Use user.id which links to profiles.id
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116: row not found
      console.error('Profile fetch error:', profileError);
      return new NextResponse(
        JSON.stringify({ error: 'Failed to retrieve user profile' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders() },
        }
      );
    }

    let stripeCustomerId = profile?.stripe_customer_id;

    // 4. Create Stripe customer if needed
    if (!stripeCustomerId) {
      if (!user.email) {
        return new NextResponse(
          JSON.stringify({
            error: 'User email is required to create Stripe customer',
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders() },
          }
        );
      }
      try {
        console.log(
          `Creating Stripe customer for user ${user.id} with email ${user.email}`
        );
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            supabaseUserId: user.id,
          },
        });
        stripeCustomerId = customer.id;
        console.log(
          `Created Stripe customer ${stripeCustomerId} for user ${user.id}`
        );

        // Update profile with new Stripe customer ID
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', user.id);

        if (updateError) {
          console.error(
            `Failed to update profile ${user.id} with Stripe Customer ID ${stripeCustomerId}:`,
            updateError
          );
          // Non-fatal, proceed with checkout but log the error.
        }
      } catch (stripeError) {
        console.error('Stripe customer creation error:', stripeError);
        // Use status code from stripeError if available, otherwise 500
        const statusCode = stripeError.statusCode || 500;
        return new NextResponse(
          JSON.stringify({ error: `Stripe error: ${stripeError.message}` }),
          {
            status: statusCode,
            headers: { 'Content-Type': 'application/json', ...corsHeaders() },
          }
        );
      }
    }

    // 5. Create Stripe Checkout Session
    try {
      const sessionConfig = {
        payment_method_types: ['card'],
        mode: 'subscription',
        customer: stripeCustomerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        // Attach user metadata directly on the subscription for reliable webhook linkage
        subscription_data: {
          metadata: {
            supabaseUserId: user.id,
          },
        },
        allow_promotion_codes: true,
        success_url: `${siteUrl}/pricing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/pricing?checkout=cancelled`,
        client_reference_id: user.id, // Link Supabase user ID
        metadata: {
          supabaseUserId: user.id,
        },
      };

      const session = await stripe.checkout.sessions.create(sessionConfig);

      if (!session.id) {
        throw new Error('Failed to create Stripe checkout session ID.');
      }

      return NextResponse.json({ sessionId: session.id }, { headers: corsHeaders() });
    } catch (stripeSessionError) {
      console.error(
        'Stripe checkout session creation error:',
        stripeSessionError
      );
      const statusCode = stripeSessionError.statusCode || 500;
      return new NextResponse(
        JSON.stringify({
          error: `Stripe session error: ${stripeSessionError.message}`,
        }),
        {
          status: statusCode,
          headers: { 'Content-Type': 'application/json', ...corsHeaders() },
        }
      );
    }
  } catch (error) {
    console.error('Checkout Session General Error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() },
      }
    );
  }
}
