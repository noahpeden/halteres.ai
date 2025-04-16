import { MetadataRoute } from 'next';
import { siteConfig } from './metadata'; // Ensure this path is correct

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*', // Apply rules to all user agents
        allow: '/',      // Allow crawling of the root and public pages by default
        // Disallow crawling of specific private or sensitive paths
        disallow: [
          '/dashboard/', // Assuming dashboard is private
          '/login/',     // Often disallowed if it contains no indexable content
          '/program/',   // Assuming program pages are private/dynamic
          '/write-program/', // Assuming this is a private creation tool
          // Add other private paths like /api/, /_next/, etc. if necessary
        ],
      },
      // You can add rules for specific user agents if needed
      // {
      //   userAgent: 'Googlebot',
      //   allow: ['/'],
      //   disallow: ['/private/'],
      // },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`, // Ensure sitemap URL is correct
    host: siteConfig.url, // Recommended to include the host
  };
} 