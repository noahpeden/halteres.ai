'use client';
import { SignIn } from '@clerk/nextjs';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import HalteresMark from '@/components/brand/HalteresMark';

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-[var(--ink-soft)] mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Haltēres
        </Link>

        <div className="athlete-card-static p-7 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <HalteresMark className="w-10 h-10" />
            <div>
              <h1 className="athlete-heading-lg">Return to the yard</h1>
              <p className="athlete-label mt-1">Self-coached. No invite code. Free while in beta.</p>
            </div>
          </div>
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/signup"
            forceRedirectUrl="/athlete"
            fallbackRedirectUrl="/athlete"
            appearance={{
              variables: {
                colorPrimary: '#8b3a2a',
                colorBackground: 'transparent',
                borderRadius: '0px',
                fontFamily: 'var(--font-ui), system-ui, sans-serif',
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
