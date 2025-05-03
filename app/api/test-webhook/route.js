import { NextResponse } from 'next/server';

// This is the function we modified in the main webhook handler
function mapLookupKeyToPlan(lookupKey) {
  if (!lookupKey) {
    console.log(
      'Warning: mapLookupKeyToPlan called with null or undefined lookupKey.'
    );
    return null;
  }

  // Updated to match the lookup keys used in the pricing page
  const monthlyKey =
    process.env.STRIPE_LOOKUP_KEY_MONTHLY || 'standard_monthly';
  const quarterlyKey =
    process.env.STRIPE_LOOKUP_KEY_QUARTERLY || 'standard_quarterly';
  const annualKey = process.env.STRIPE_LOOKUP_KEY_ANNUAL || 'standard_annual';

  console.log(`Testing lookup key: ${lookupKey}`);
  console.log(`Monthly key: ${monthlyKey}`);
  console.log(`Quarterly key: ${quarterlyKey}`);
  console.log(`Annual key: ${annualKey}`);

  switch (lookupKey) {
    case monthlyKey:
      return 'monthly';
    case quarterlyKey:
      return 'quarterly';
    case annualKey:
      return 'annual';
    default:
      console.log(
        `Warning: Unrecognized Stripe price lookup key: ${lookupKey}`
      );
      return null;
  }
}

export async function GET(req) {
  // Test all possible keys
  const testKeys = [
    'standard_monthly',
    'standard_quarterly',
    'standard_annual',
    'monthly',
    'quarterly',
    'annual',
    null,
    undefined,
    'something_else',
  ];

  const results = {};

  testKeys.forEach((key) => {
    results[key || 'null/undefined'] = mapLookupKeyToPlan(key);
  });

  return NextResponse.json({
    message: 'Test results for mapLookupKeyToPlan function',
    results,
  });
}
