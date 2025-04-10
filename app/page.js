/* eslint-disable react/no-unescaped-entities */
import { metadata } from './metadata';
import HomeClient from '@/components/home/HomeClient';

// This overrides the default metadata for this route
export const generateMetadata = () => {
  return {
    ...metadata,
    title: 'HalteresAI - AI-Powered Fitness Programming for Professionals',
    description:
      'Create personalized, AI-generated workout programs for your gym or clients. Save time, deliver better results, and grow your fitness business with HalteresAI.',
  };
};

// Add structured data for better SEO
export default function HomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'HalteresAI',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
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
