import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import PricingClient from '../components/PricingClient'; // Adjust path if needed
import Link from 'next/link';

async function fetchUserSubscription(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(
      'subscription_status, subscription_plan, trial_end_date, generations_remaining, generations_today, last_generation_date'
    )
    .eq('id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching profile on pricing page:', error);
    // Return user but indicate profile error
    return {
      user,
      profile: null,
      error: 'Failed to load subscription status.',
    };
  }

  return { user, profile };
}

export default async function PricingPage() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        // set/remove are not typically needed in Server Components for read operations
      },
    }
  );

  const { user, profile, error } = await fetchUserSubscription(supabase);

  // Define plan details (could also fetch from DB/Stripe if dynamic)
  const plans = [
    {
      name: 'Monthly',
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY,
      price: '$99',
      interval: '/ month',
      features: [
        'Unlimited Program Generations',
        'Full Feature Access',
        'Cancel Anytime',
      ],
      lookupKey: 'standard_monthly', // Match the key set in Stripe
    },
    {
      name: 'Quarterly',
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_QUARTERLY,
      price: '$269',
      interval: '/ quarter',
      features: [
        'Unlimited Program Generations',
        'Full Feature Access',
        'Discounted Rate',
        'Billed Every 3 Months',
      ],
      lookupKey: 'standard_quarterly',
    },
    {
      name: 'Annual',
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL,
      price: '$999',
      interval: '/ year',
      features: [
        'Unlimited Program Generations',
        'Full Feature Access',
        'Best Value',
        'Billed Annually',
      ],
      lookupKey: 'standard_annual',
    },
  ];

  // Simple loading/error state (improve as needed)
  if (error) {
    // Handle error appropriately - maybe show a message
    // For now, just log it server-side and proceed without profile data
    console.error('Pricing Page Error:', error);
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-center mb-4">Pricing Plans</h1>
      <p className="text-xl text-center text-gray-600 mb-10">
        Choose the plan that fits your fitness journey.
      </p>

      {/* Pass user and profile data to the client component */}
      <PricingClient user={user} profile={profile} plans={plans} />

      {/* Optional: Add a section for logged-out users or those needing login */}
      {!user && (
        <div className="text-center mt-12">
          <p className="mb-4">Already have an account?</p>
          <Link
            href="/login?redirectedFrom=/pricing"
            className="btn btn-outline"
          >
            Log In
          </Link>
        </div>
      )}
    </div>
  );
}
