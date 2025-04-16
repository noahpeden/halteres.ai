import type { Metadata } from 'next';

export const siteConfig = {
  name: 'HalteresAI',
  description: 'AI-Powered, Personalized Workouts for Fitness Professionals',
  url: 'https://halteres.ai',
  ogImage: '/favicon.ico', // Consider using a more descriptive OG image path if available
  logo: '/images/logo.png',
  links: {
    twitter: 'https://twitter.com/halteresai',
    github: 'https://github.com/halteresai', // Update if you have a GitHub organization
  },
};

// Apply the Metadata type from Next.js
export const metadata: Metadata = {
  metadataBase: new URL('https://halteres.ai'), // Recommended to set metadataBase
  title: {
    default: 'HalteresAI - AI-Powered Fitness Programming',
    template: '%s | HalteresAI',
  },
  description:
    'Create personalized, AI-generated workout programs for your gym or clients. Save time and deliver better results with HalteresAI.',
  keywords: [
    'fitness programming',
    'AI workouts',
    'gym programming',
    'workout generator',
    'fitness AI',
    'personal trainer software',
    'gym management',
    'CrossFit programming',
  ],
  authors: [
    {
      name: 'HalteresAI Team',
      url: siteConfig.url, // Use defined siteConfig URL
    },
  ],
  creator: siteConfig.name, // Use defined siteConfig name
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico', // Consider using different sizes or formats if needed
    apple: '/apple-icon.png', // Use the correct path for apple-touch-icon
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    title: 'HalteresAI - AI-Powered Fitness Programming',
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [
      {
        url: siteConfig.ogImage, // Use defined siteConfig ogImage
        width: 48, // Update width/height if using a different OG image
        height: 48,
        alt: siteConfig.description,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HalteresAI - AI-Powered Fitness Programming',
    description: siteConfig.description,
    images: [siteConfig.ogImage], // Use defined siteConfig ogImage
    creator: '@halteresai', // Ensure this matches the Twitter handle in siteConfig.links.twitter
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // Add manifest if not automatically handled
  // manifest: '/site.webmanifest',
}; 