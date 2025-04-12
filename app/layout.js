import './globals.css';
import { Nunito_Sans, Poppins } from 'next/font/google';
import { metadata } from './simple-metadata';
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

// Export the static metadata
export { metadata };

export default function RootLayout({ children }) {
  return (
    <html
      className={`${nunitoSans.variable} ${poppins.variable} ${inter.className}`}
      lang="en"
    >
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body>
        <AuthProvider>
          <ClientProviders>{children}</ClientProviders>
        </AuthProvider>
      </body>
    </html>
  );
}
