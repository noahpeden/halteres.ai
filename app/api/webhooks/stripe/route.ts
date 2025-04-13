import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { buffer } from 'node:stream/consumers';

// Ensure environment variables are loaded and asserted as non-null
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey || !stripeWebhookSecret) {
  throw new Error("Missing required environment variables for Stripe/Supabase integration.");
}

// Initialize Supabase admin client
const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Stripe
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20', // Use a fixed, recent API version
  typescript: true,
});

// Define valid subscription statuses for type safety
type SubscriptionStatus = 'trialing' | 'active' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'past_due' | 'unpaid' | 'free';

const relevantEvents = new Set([
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  // 'invoice.payment_succeeded', // Can be useful for confirming renewals
  // 'invoice.payment_failed', // Useful for triggering dunning emails or downgrades
]);

export async function POST(req: NextRequest) {
  const signature = headers().get('stripe-signature');
  let event: Stripe.Event;

  try {
    // Use buffer to read the raw request body
    const rawBody = await buffer(req.body);
    if (!signature) {
      console.error('Webhook Error: Missing stripe-signature header');
      return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
    }
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      stripeWebhookSecret! // Already checked for existence above
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle only the relevant events
  if (relevantEvents.has(event.type)) {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as Stripe.Checkout.Session;
          // Important: Ensure userId is passed in metadata during Checkout session creation
          if (session.mode === 'subscription' && session.metadata?.userId) {
            await handleSubscriptionChange(session.subscription as string, session.customer as string, session.metadata.userId);
          } else {
            console.warn(`Unhandled checkout session mode: ${session.mode} or missing userId metadata.`);
          }
          break;

        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionChange(subscription.id, subscription.customer as string);
          break;

        default:
          console.warn(`Unhandled relevant event type: ${event.type}`);
      }
    } catch (error: any) {
      console.error('Error handling webhook event:', error);
      // Optionally send error details to Stripe or a monitoring service
      return NextResponse.json({ error: `Webhook handler failed: ${error.message}` }, { status: 500 });
    }
  } else {
    console.log(`Ignoring irrelevant event type: ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  return NextResponse.json({ received: true });
}

// --- Unified Helper function for handling subscription changes ---

async function handleSubscriptionChange(subscriptionId: string, customerId: string, userIdFromCheckout?: string) {
  let userId = userIdFromCheckout;

  // If userId not provided (e.g., from subscription update), find it via customerId
  if (!userId) {
    const { data: profile, error: findError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();

    if (findError || !profile) {
      // This can happen if a user is deleted locally but subscription remains in Stripe.
      console.warn(`Could not find profile for Stripe customer ${customerId}. Subscription update/delete might be for an orphaned customer. Error: ${findError?.message}`);
      return; // Exit gracefully
    }
    userId = profile.id;
  }

  console.log(`Processing subscription change for user: ${userId}, subscription: ${subscriptionId}, customer: ${customerId}`);

  // Retrieve the latest subscription details from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price.product'] // Optional: Expand product info if needed
  });

  if (!subscription) {
    console.error(`Could not retrieve subscription ${subscriptionId} from Stripe.`);
    throw new Error(`Failed to retrieve subscription ${subscriptionId}`);
  }

  const profileUpdateData = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: subscription.items.data[0]?.price.id ?? null,
    subscription_status: subscription.status as SubscriptionStatus,
    current_period_end: subscription.cancel_at_period_end
      ? new Date(subscription.cancel_at * 1000).toISOString() // Use cancel_at if scheduled
      : new Date(subscription.current_period_end * 1000).toISOString(),
  };

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update(profileUpdateData)
    .eq('id', userId);

  if (updateError) {
    console.error(`Supabase error updating profile for user ${userId}:`, updateError);
    throw new Error(`Failed to update profile for user ${userId}: ${updateError.message}`);
  }

  console.log(`Successfully updated profile for user ${userId}. New status: ${profileUpdateData.subscription_status}`);
}