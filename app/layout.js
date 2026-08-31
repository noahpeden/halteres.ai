import './globals.css';
import { Figtree, Fraunces, IBM_Plex_Mono } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import AppChrome from './components/AppChrome';
import TrialStatusBanner from './components/TrialStatusBanner';
import { StripeProvider } from './contexts/StripeContext';
import { metadata } from './simple-metadata';

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
});

const figtree = Figtree({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-ui',
  weight: ['400', '500', '600', '700'],
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
  weight: ['400', '500', '600'],
});

export { metadata };

export default async function RootLayout({ children }) {
  const { createClient } = await import('@/utils/supabase/server');
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html
      className={`${fraunces.variable} ${figtree.variable} ${plexMono.variable}`}
      lang="en"
      data-theme="palaestra"
    >
      <head>
        <link rel="icon" href="/favicon.jpeg" type="image/jpeg" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className={`${figtree.className} palaestra-body`} suppressHydrationWarning={true}>
        <StripeProvider>
          <AuthProvider initialSession={session}>
            <AppChrome>
              <TrialStatusBanner />
              {children}
            </AppChrome>
          </AuthProvider>
        </StripeProvider>
      </body>
    </html>
  );
}
