'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';

// Create a context for the Stripe instance
const StripeContext = createContext(null);

// Create a provider component
export const StripeProvider = ({ children }) => {
  const [stripePromise, setStripePromise] = useState(null);

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (publicKey) {
      // Initialize Stripe only once with the publishable key
      // @ts-ignore - loadStripe type might expect specific options not used here
      setStripePromise(loadStripe(publicKey));
    } else {
      console.warn(
        'StripeContext: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set.'
      );
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  return (
    <StripeContext.Provider value={stripePromise}>
      {children}
    </StripeContext.Provider>
  );
};

// Custom hook to use the Stripe context
export const useStripeContext = () => {
  const context = useContext(StripeContext);
  if (context === undefined) {
    throw new Error('useStripeContext must be used within a StripeProvider');
  }
  // The context value is the promise returned by loadStripe
  // Components using this will need to handle the promise resolution
  // or use <Elements> from @stripe/react-stripe-js if using Stripe Elements
  return context;
};
