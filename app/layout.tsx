import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Nunito_Sans, Poppins } from 'next/font/google';
import { metadata as simpleMetadata } from './simple-metadata'; // Renamed import to avoid conflict
import ClientProviders from './client-providers';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';

export const nunitoSans = Nunito_Sans({
  weight: ['300', '400', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-nunito-sans',
});

export const poppins = Poppins({
  weight: ['300', '400', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
});

const inter = Inter({ subsets: ['latin'] });

// Export the static metadata - Ensure simple-metadata.ts exports Metadata type
export const metadata: Metadata = simpleMetadata;

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      className={`${nunitoSans.variable} ${poppins.variable} ${inter.className}`}
      lang="en"
    >
      <head>
        {/* Favicon and manifest links are often handled by Next.js metadata automatically */}
        {/* Consider removing manual links if using metadata API for icons/manifest */}
        {/* <link rel="icon" href="/favicon.ico" /> */}
        {/* <link rel="shortcut icon" href="/favicon-16x16.png" /> */}
        {/* <link rel="apple-touch-icon" href="/apple-touch-icon.png" /> */}
        {/* <link rel="manifest" href="/site.webmanifest" /> */}
      </head>
      <body>
        <AuthProvider>
          <ClientProviders>{children}</ClientProviders>
        </AuthProvider>
      </body>
    </html>
  );
}
