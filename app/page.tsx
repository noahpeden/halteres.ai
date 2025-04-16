/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from 'next';
import { metadata as baseMetadata } from './metadata'; // Import base metadata
import HomeClient from '@/components/home/HomeClient';

// This overrides the default metadata for this route
export const generateMetadata = (): Metadata => {
  // Assuming baseMetadata is compatible with Metadata type
  // If ./metadata.js is not yet converted, you might need to adjust types
  const pageMetadata: Metadata = {
    ...(baseMetadata as Metadata), // Type assertion might be needed initially
    title: 'HalteresAI - AI-Powered Fitness Programming for Professionals',
    description:
      'Create personalized, AI-generated workout programs for your gym or clients. Save time, deliver better results, and grow your fitness business with HalteresAI.',
    // Add other necessary fields if baseMetadata doesn't cover them
  };
  return pageMetadata;
};

// Add structured data for better SEO
export default function HomePage(): JSX.Element {
  // Define a more specific type for jsonLd if possible, using schema types
  const jsonLd: any = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'HalteresAI',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0', // Price should ideally be a number if appropriate for schema
      priceCurrency: 'USD',
    },
    description: 'AI-Powered, Personalized Workouts for Fitness Professionals',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient />
    </>
  );
}
