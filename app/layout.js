import './globals.css';
import { Nunito_Sans, Poppins } from 'next/font/google';
import { metadata } from './simple-metadata';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import Navbar from './components/Navbar';
import { StripeProvider } from './contexts/StripeContext';
// No longer need createClient imported directly here if called inside
// import { createClient } from '@/utils/supabase/server'; // <-- Remove or comment out if unused at module scope

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

export default async function RootLayout({ children }) {
  // Import createClient inside the function if not imported at module scope
  // This ensures it uses the correct context when called.
  const { createClient } = await import('@/utils/supabase/server');
  const supabase = await createClient(); // Await if createClient is async

  // Fetch session data inside the component
  const {
    data: { session },
  } = await supabase.auth.getSession();

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
      <body suppressHydrationWarning={true}>
        <StripeProvider>
          {/* Pass the fetched session to AuthProvider */}
          <AuthProvider initialSession={session}>
            <Navbar />
            <main className="pt-24">{children}</main>
          </AuthProvider>
        </StripeProvider>
      </body>
    </html>
  );
}
