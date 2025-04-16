import { MetadataRoute } from 'next';
import { siteConfig } from './metadata'; // Ensure this path is correct and metadata.ts exports siteConfig

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.url;

  // Add more static routes here as needed
  const staticRoutes = [
    '/',
    '/login',
    '/features',
    '/pricing',
    '/contact',
    // Add other known static public routes
  ].map((route) => ({
    url: `${baseUrl}${route === '/' ? '' : route}`,
    lastModified: new Date(), // Consider making this dynamic based on content changes if possible
    changeFrequency: 'monthly' as const, // Use 'as const' for literal types
    priority: route === '/' ? 1 : 0.8,
  }));

  // If you have dynamic routes (e.g., blog posts, user profiles), fetch them and add them here
  // const dynamicRoutes = await fetchDynamicRoutes();
  // const allRoutes = [...staticRoutes, ...dynamicRoutes];

  return staticRoutes; // Return all routes once dynamic ones are added
} 