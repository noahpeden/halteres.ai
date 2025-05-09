import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import PricingClient from '../components/PricingClient'; // Adjust path if needed
import Link from 'next/link';
import { metadata as baseMetadata } from '../metadata'; // Import base metadata

// Generate Metadata (using function from old page.js)
export const generateMetadata = () => {
  return {
    ...baseMetadata, // Spread the base metadata
    title: 'Pricing | HalteresAI',
    description:
      'Choose the HalteresAI plan that best fits your needs. Monthly, Quarterly, and Annual options available with unlimited workout generations.',
  };
};

async function fetchUserSubscription(supabase) {
  try {
    // First check if we can get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error('Auth error on pricing page:', authError);
      return {
        user: null,
        profile: null,
        error: 'Authentication failed: ' + authError.message,
      };
    }

    if (!user) {
      // No error but no user - not logged in
      console.log('Pricing page: No authenticated user found - not logged in');
      return { user: null, profile: null };
    }

    console.log(
      `Pricing page: Found authenticated user ${user.id}, fetching profile...`
    );

    // Now fetch the profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(
        'subscription_status, subscription_plan, trial_end_date, generations_remaining, generations_today, last_generation_date'
      )
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile on pricing page:', profileError);
      // Return user but indicate profile error with the specific error message
      return {
        user,
        profile: null,
        error: `Profile fetch failed: ${
          profileError.message || profileError.code || 'Unknown error'
        }`,
      };
    }

    console.log(
      `Pricing page: Successfully fetched profile for user ${user.id}`
    );
    return { user, profile };
  } catch (error) {
    console.error('Unexpected error in fetchUserSubscription:', error);
    return {
      user: null,
      profile: null,
      error: `Unexpected error: ${error.message || 'Unknown error'}`,
    };
  }
}

// FAQ Data (extracted from old page.js for clarity)
const faqs = [
  {
    question: 'Are there any long-term contracts?',
    answer:
      'No, our pricing is flexible. Choose monthly, quarterly, or annual billing. You can cancel your subscription anytime.',
  },
  {
    question: 'What does "unlimited generations" mean?',
    answer:
      'You can create as many workout programs as you need with no additional cost within fair use policy guidelines. There are no hard generation limits or tiers on paid plans.',
  },
  {
    question: 'Do you offer a free trial?',
    answer:
      'Yes, new users get a free trial with limited generations to experience HalteresAI. Sign up today to get started.',
  },
  {
    question: 'Can I change plans later?',
    answer:
      'Yes, you can upgrade, downgrade, or cancel your plan at any time through your account settings (via the Stripe Billing Portal).',
  },
];

export default async function PricingPage({ searchParams }) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
    }
  );

  // Fetch user subscription data with better error handling
  const { user, profile, error } = await fetchUserSubscription(supabase);

  // Get error from URL query parameters (passed directly to page component in App Router)
  const urlError = searchParams?.error || null;

  // Combine any URL error with the fetch error
  const displayError = urlError || error;

  // Define plan details (could also fetch from DB/Stripe if dynamic)
  const plans = [
    {
      name: 'Monthly',
      priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY,
      price: '$99',
      interval: '/ month',
      features: [
        'Unlimited Program Generations*',
        'Full Feature Access',
        'Billed Monthly',
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
        'Unlimited Program Generations*',
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
        'Unlimited Program Generations*',
        'Full Feature Access',
        'Best Value (Save ~15%)',
        'Billed Annually',
      ],
      lookupKey: 'standard_annual',
    },
  ];

  // Simple loading/error state (improve as needed)
  if (displayError) {
    // Handle error appropriately - maybe show a message
    // For now, just log it server-side and proceed without profile data
    console.error('Pricing Page Error:', displayError);
  }

  return (
    <div className="min-h-screen bg-base-100">
      <main className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-base-content sm:text-5xl sm:tracking-tight lg:text-6xl">
            Simple, Flexible Pricing for Personal Trainers and Coaches
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-base-content/80">
            Choose the plan that fits your fitness business. Upgrade, downgrade,
            or cancel anytime.
          </p>
          <p className="mt-2 text-sm text-base-content/60">
            *Subject to fair use policy.
          </p>
        </div>

        {displayError && user && (
          <div className="alert alert-error shadow-lg mb-8">
            <div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current flex-shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2 2m2-2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{displayError}</span>
            </div>
          </div>
        )}

        <PricingClient user={user} profile={profile} plans={plans} />

        {!user && (
          <div className="text-center mt-16">
            <p className="mb-4 text-lg">Already have an account?</p>
            <Link
              href="/login?redirectedFrom=/pricing"
              className="btn btn-primary"
            >
              Log In to Subscribe
            </Link>
          </div>
        )}

        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-base-content">
            Frequently Asked Questions
          </h2>
          <dl className="mt-8 space-y-6 max-w-3xl mx-auto text-left">
            {faqs.map((faq, index) => (
              <div key={index} className="collapse collapse-arrow bg-base-200">
                <input
                  type="radio"
                  name="pricing-faq"
                  defaultChecked={index === 0}
                />
                <div className="collapse-title text-xl font-medium">
                  {faq.question}
                </div>
                <div className="collapse-content">
                  <p className="text-base-content/80">{faq.answer}</p>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </main>
    </div>
  );
}
