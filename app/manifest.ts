import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Halteres AI',
    short_name: 'Halteres AI',
    description: 'AI-Powered Fitness Programming for Professionals',
    start_url: '/',
    display: 'standalone',
    background_color: '#152e56',
    theme_color: '#152e56',
    icons: [
      {
        src: '/icon.png', // Ensure /public/icon.png exists and is the intended icon
        sizes: '32x32',    // Consider adding more icon sizes (e.g., 192x192, 512x512) for PWA compatibility
        type: 'image/png',
      },
      {
        src: '/apple-icon.png', // Ensure /public/apple-icon.png exists
        sizes: '180x180',
        type: 'image/png',
      },
      // Example for adding more sizes:
      // {
      //   src: '/android-chrome-192x192.png',
      //   sizes: '192x192',
      //   type: 'image/png',
      // },
      // {
      //   src: '/android-chrome-512x512.png',
      //   sizes: '512x512',
      //   type: 'image/png',
      // },
    ],
  };
} 