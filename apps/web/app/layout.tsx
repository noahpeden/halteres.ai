import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Analytics } from '@/components/Analytics';
import './globals.css';

export const metadata: Metadata = {
  title: 'Halteres',
  description: 'Personalized training programs that get smarter every workout',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Suspense>
          <Analytics />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
