import type { Metadata } from 'next';

// Simple metadata configuration
export const metadata: Metadata = {
  title: 'HalteresAI',
  description:
    'AI-Powered Fitness Programming for fitness professionals and gyms',
  icons: {
    // Ensure these paths are correct and files exist in /public
    icon: [{ url: '/icon.png', sizes: '32x32', type: 'image/png' }], // Check if /icon.png exists
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }], // Check if /apple-icon.png exists
  },
  // Add metadataBase if this metadata is used directly in a layout/page
  // metadataBase: new URL('https://halteres.ai'),
}; 