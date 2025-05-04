import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/utils/stripe';
import { createClient } from '@supabase/supabase-js';

// Disable Next.js body parsing for this route
export const config = {
  api: {
    bodyParser: false,
  },
};

const relevantEvents = new Set([
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
]);

// Helper function to update Supabase profile
// Use Supabase Admin client for elevated privileges
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updateSubscriptionStatus(
  stripeCustomerId,
  subscriptionId,
  status,
  plan,
  currentPeriodEnd,
  userIdFromMetadata,
  priceId = null,
  cancelAtPeriodEnd = false
) {
  console.log(
    `Webhook: Updating subscription for Stripe Customer ${stripeCustomerId}, Subscription ${subscriptionId}, Status: ${status}, Plan: ${plan}`
  );

  // Construct the update payload carefully, avoid undefined values if possible
  const profileUpdateData = {
    stripe_subscription_id: subscriptionId,
    subscription_status: status,
    // Only include plan if it's not null/undefined. Use null to clear the field.
    subscription_plan: plan !== undefined ? plan : null,
    // Conditionally add current_period_end only if it's a valid date
    ...(currentPeriodEnd && {
      current_period_end: currentPeriodEnd.toISOString(),
    }),
    // Temporarily comment out to avoid schema cache/missing column error
    // cancel_at_period_end: cancelAtPeriodEnd,
    // Conditionally add stripe_price_id only if provided
    ...(priceId && { stripe_price_id: priceId }),
  };

  let userId = userIdFromMetadata;

  // If userId wasn't in metadata (older objects might miss it), try finding by customer ID
  if (!userId) {
    console.log(
      `Webhook Info: User ID not in metadata for customer ${stripeCustomerId}. Querying profile...`
    );
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id') // Assuming 'id' is the primary key / user_id link
      .eq('stripe_customer_id', stripeCustomerId)
      .single();

    if (profileError || !profileData) {
      console.error(
        `Webhook Error: Profile not found for Stripe Customer ID: ${stripeCustomerId}`,
        profileError
      );
      // Cannot proceed without linking to a user
      return {
        error: `Webhook handler error: No profile found for customer ${stripeCustomerId}`,
      };
    }
    userId = profileData.id;
    console.log(
      `Webhook Info: Found user ID ${userId} for customer ${stripeCustomerId}`
    );
  }

  // Always update using the Supabase user ID (which is profile.id in our case)
  console.log(
    `Webhook Info: Updating profile ${userId} with data:`,
    profileUpdateData
  );
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update(profileUpdateData)
    .eq('id', userId); // Update based on the user's Supabase ID

  if (updateError) {
    console.error(
      `Webhook Error: Failed to update profile for user ${userId} (Stripe Customer ${stripeCustomerId})`,
      updateError
    );
    return { error: `Webhook handler error: ${updateError.message}` };
  }

  console.log(`Webhook: Successfully updated profile for user ${userId}`);
  return { success: true };
}

export async function POST(req) {
  const body = await req.text();
  const signature = (await headers()).get('Stripe-Signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    console.error('Webhook Error: Missing Stripe signature or webhook secret.');
    return new NextResponse(
      JSON.stringify({ error: 'Webhook configuration error.' }),
      { status: 400 }
    );
  }

  let event;

  try {
    if (!signature) {
      throw new Error('Missing Stripe signature');
    }
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return new NextResponse(
      JSON.stringify({ error: `Webhook error: ${err.message}` }),
      { status: 400 }
    );
  }

  if (relevantEvents.has(event.type)) {
    console.log(`Webhook: Received relevant event: ${event.type}`);
    try {
      let subscription = null;
      let customerId = null;
      let userIdFromMetadata = undefined;
      let requiresUpdate = false;
      let statusToUpdate = null;
      let planToUpdate = null;
      let periodEndToUpdate = null;

      switch (event.type) {
        case 'checkout.session.completed':
          const checkoutSession = event.data.object;
          const checkoutSubscriptionId = checkoutSession.subscription;
          if (
            checkoutSession.mode === 'subscription' &&
            checkoutSubscriptionId &&
            checkoutSession.customer
          ) {
            console.log(
              `Webhook Info: Processing checkout.session.completed for session ${checkoutSession.id}`
            );
            subscription = await stripe.subscriptions.retrieve(
              checkoutSubscriptionId
            );

            // Add detailed logging about the subscription
            console.log(
              `Webhook Debug: Retrieved subscription ${subscription.id} with status ${subscription.status}`
            );
            console.log(
              `Webhook Debug: First subscription item price lookup_key: ${subscription.items.data[0]?.price?.lookup_key}`
            );
            console.log(
              `Webhook Debug: First subscription item price ID: ${subscription.items.data[0]?.price?.id}`
            );
            console.log(
              `Webhook Debug: Mapped plan: ${mapLookupKeyToPlan(
                subscription.items.data[0]?.price?.lookup_key
              )}`
            );

            customerId = checkoutSession.customer;
            userIdFromMetadata =
              checkoutSession.client_reference_id ??
              checkoutSession.metadata?.supabaseUserId;

            // If we have a user ID, update their profile with the customer ID
            if (userIdFromMetadata) {
              await supabaseAdmin
                .from('profiles')
                .update({ stripe_customer_id: customerId })
                .eq('id', userIdFromMetadata);
            }

            requiresUpdate = true;
          } else {
            console.warn(
              `Webhook: Ignoring checkout.session.completed event in non-subscription mode or missing data. Session ID: ${checkoutSession.id}`
            );
          }
          break;

        case 'customer.subscription.updated':
          subscription = event.data.object;
          customerId = subscription.customer;
          userIdFromMetadata = subscription.metadata?.supabaseUserId;
          console.log(
            `Webhook Info: Processing customer.subscription.updated for sub ${subscription.id}, status ${subscription.status}`
          );
          requiresUpdate = true;
          break;

        case 'customer.subscription.deleted':
          subscription = event.data.object;
          customerId = subscription.customer;
          userIdFromMetadata = subscription.metadata?.supabaseUserId;
          console.log(
            `Webhook Info: Processing customer.subscription.deleted for sub ${subscription.id}`
          );
          requiresUpdate = true;
          planToUpdate = null;
          break;

        case 'invoice.paid':
          const invoicePaid = event.data.object;
          const paidSubscriptionId = invoicePaid.subscription;
          if (paidSubscriptionId && invoicePaid.customer) {
            console.log(
              `Webhook Info: Processing invoice.paid for invoice ${invoicePaid.id}, sub ${paidSubscriptionId}`
            );
            subscription = await stripe.subscriptions.retrieve(
              paidSubscriptionId
            );
            customerId = invoicePaid.customer;
            userIdFromMetadata = subscription?.metadata?.supabaseUserId;
            requiresUpdate = true;
          } else {
            console.warn(
              `Webhook: Ignoring invoice.paid event without subscription/customer. Invoice ID: ${invoicePaid.id}`
            );
          }
          break;

        case 'invoice.payment_failed':
          const invoiceFailed = event.data.object;
          const failedSubscriptionId = invoiceFailed.subscription;
          if (failedSubscriptionId && invoiceFailed.customer) {
            console.log(
              `Webhook Info: Processing invoice.payment_failed for invoice ${invoiceFailed.id}, sub ${failedSubscriptionId}`
            );
            subscription = await stripe.subscriptions.retrieve(
              failedSubscriptionId
            );
            customerId = invoiceFailed.customer;
            userIdFromMetadata = subscription?.metadata?.supabaseUserId;
            requiresUpdate = true;
            statusToUpdate = 'past_due';
            const currentPeriodEndTimestamp = subscription.current_period_end;
            if (subscription && typeof currentPeriodEndTimestamp === 'number') {
              planToUpdate = mapLookupKeyToPlan(
                subscription.items.data[0]?.price?.lookup_key
              );
              periodEndToUpdate = new Date(currentPeriodEndTimestamp * 1000);
              console.log(
                `Webhook: Payment failed for subscription ${subscription.id}, customer ${customerId}. Status: ${subscription.status}. Will set DB status to: ${statusToUpdate}`
              );
            } else {
              console.error(
                `Webhook Error: Could not get current_period_end for failed payment sub ${failedSubscriptionId}`
              );
              requiresUpdate = false;
            }
          } else {
            console.warn(
              `Webhook: Ignoring invoice.payment_failed event without subscription/customer. Invoice ID: ${invoiceFailed.id}`
            );
          }
          break;

        default:
          console.warn(
            `Webhook: Unhandled relevant event type in switch: ${event.type}`
          );
          return new NextResponse(
            JSON.stringify({ message: 'Unhandled event type' }),
            { status: 400 }
          );
      }

      // Common logic for subscription updates
      if (requiresUpdate && subscription && customerId) {
        const currentPeriodEndTimestamp = subscription.current_period_end;
        let finalPeriodEnd = null; // Default to null

        // Check if the timestamp is valid
        if (typeof currentPeriodEndTimestamp === 'number') {
          // If a specific periodEndToUpdate was set (e.g., for failed payment), use it, otherwise use the subscription's
          finalPeriodEnd =
            periodEndToUpdate ?? new Date(currentPeriodEndTimestamp * 1000);
        } else {
          // Timestamp is invalid (undefined, null, etc.)
          if (event.type === 'checkout.session.completed') {
            // For checkout completion, this might be a timing issue.
            // Log a warning but allow the update for status/plan/IDs.
            // The date should arrive with customer.subscription.updated later.
            console.warn(
              `Webhook Warning: current_period_end timestamp (${currentPeriodEndTimestamp}) invalid for subscription ${subscription.id} during checkout.session.completed. Proceeding without date.`
            );
            // finalPeriodEnd remains null, update will proceed without it
          } else {
            // For other events, an invalid timestamp is a real error. Skip update.
            console.error(
              `Webhook Error: Invalid current_period_end timestamp (${currentPeriodEndTimestamp}) for subscription ${subscription.id} during event ${event.type}. Skipping update.`
            );
            // Skip the update call below by returning early
            return new NextResponse(
              JSON.stringify({
                received: true,
                warning: 'Skipped update due to invalid period end timestamp.',
              }),
              { status: 200 }
            );
          }
        }

        // Determine final status and plan (logic remains the same)
        const finalStatus =
          statusToUpdate ?? mapStripeStatus(subscription.status);
        const finalPlan =
          event.type === 'customer.subscription.deleted'
            ? null
            : planToUpdate ??
              mapLookupKeyToPlan(subscription.items.data[0]?.price?.lookup_key);
        // const finalPeriodEnd = <-- This is now handled above
        //   periodEndToUpdate ?? new Date(currentPeriodEndTimestamp * 1000);

        // Get the price ID for subscription
        const priceId = subscription.items.data[0]?.price?.id || null;
        // Get the cancel_at_period_end status
        const cancelAtPeriodEnd = subscription.cancel_at_period_end || false;

        if (!finalStatus) {
          console.warn(
            `Webhook: Could not map Stripe status '${subscription.status}' to a known status string for subscription ${subscription.id}. Skipping update.`
          );
        } else if (finalStatus === 'active' && !finalPlan) {
          console.error(
            `Webhook Error: Cannot set status to 'active' without a valid plan mapping for subscription ${subscription.id} (Lookup Key: ${subscription.items.data[0]?.price?.lookup_key}). Skipping update.`
          );
        } else {
          console.log(
            // Updated log to show potentially null finalPeriodEnd
            `Webhook Info: Calling updateSubscriptionStatus for sub ${subscription.id}, customer ${customerId}, status ${finalStatus}, plan ${finalPlan}, price ${priceId}, cancelAtPeriodEnd: ${cancelAtPeriodEnd}, periodEnd: ${finalPeriodEnd}`
          );
          const { error } = await updateSubscriptionStatus(
            customerId,
            subscription.id,
            finalStatus,
            finalPlan,
            finalPeriodEnd, // Pass the potentially null Date object
            userIdFromMetadata,
            priceId,
            cancelAtPeriodEnd
          );
          if (error) {
            return new NextResponse(JSON.stringify({ error }), {
              status: 500,
            });
          }
        }
      } else if (requiresUpdate) {
        console.log(
          `Webhook: Skipping update for subscription ${subscription.id} due to missing data.`
        );
      }
    } catch (err) {
      console.error(`Webhook Error: Unhandled error: ${err.message}`);
      return new NextResponse(
        JSON.stringify({ error: `Webhook error: ${err.message}` }),
        { status: 500 }
      );
    }
  } else {
    console.log(`Webhook: Received irrelevant event: ${event.type}`);
  }

  return new NextResponse(JSON.stringify({ received: true }), { status: 200 });
}

// --- Helper mapping functions (Plain JS) ---

function mapLookupKeyToPlan(lookupKey) {
  if (!lookupKey) {
    console.warn(
      'Webhook Warning: mapLookupKeyToPlan called with null or undefined lookupKey.'
    );
    return null;
  }
  // Updated to match the lookup keys used in the pricing page
  const dailyKey = process.env.STRIPE_LOOKUP_KEY_DAILY || 'standard_daily';
  const monthlyKey =
    process.env.STRIPE_LOOKUP_KEY_MONTHLY || 'standard_monthly';
  const quarterlyKey =
    process.env.STRIPE_LOOKUP_KEY_QUARTERLY || 'standard_quarterly';
  const annualKey = process.env.STRIPE_LOOKUP_KEY_ANNUAL || 'standard_annual';

  switch (lookupKey) {
    case dailyKey:
      return 'daily';
    case monthlyKey:
      return 'monthly';
    case quarterlyKey:
      return 'quarterly';
    case annualKey:
      return 'annual';
    default:
      console.warn(
        `Webhook Warning: Unrecognized Stripe price lookup key: ${lookupKey}`
      );
      return null;
  }
}

function mapStripeStatus(stripeStatus) {
  switch (stripeStatus) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'canceled':
      return 'canceled';
    case 'past_due':
      return 'past_due';
    case 'incomplete':
      return 'incomplete';
    case 'incomplete_expired':
      return 'incomplete_expired';
    case 'unpaid':
      return 'past_due'; // Map unpaid to past_due as well
    default:
      console.warn(
        `Webhook Warning: Unrecognized Stripe subscription status: ${stripeStatus}`
      );
      return null;
  }
}
