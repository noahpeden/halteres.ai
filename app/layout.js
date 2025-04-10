import './globals.css';
import { Nunito_Sans, Poppins } from 'next/font/google';
import { metadata } from './simple-metadata';
import ClientProviders from './client-providers';

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

// Export the static metadata
export { metadata };

export default function RootLayout({ children }) {
  return (
    <html className={`${nunitoSans.variable} ${poppins.variable}`} lang="en">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
