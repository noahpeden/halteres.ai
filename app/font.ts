import { Inter } from 'next/font/google';

// Initialize the Inter font with specified subsets and variable name
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

// Export the font instance(s)
// TypeScript infers the type returned by Inter correctly
export const fonts = {
  inter,
}; 