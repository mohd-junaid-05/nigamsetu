import { Suspense } from 'react';
import { SignUp } from '@clerk/nextjs';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sign Up | NigamSetu',
  description: 'Create your NigamSetu citizen account to report public infrastructure defects with evidence-based verification.',
};

export default function SignUpPage() {
  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="mb-6 text-center flex flex-col items-center">
          <Link href="/" className="group mb-3 block" title="Go to NigamSetu Home">
            <div className="w-16 h-16 rounded-2xl bg-white p-1.5 shadow-md border border-border flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105">
              <img
                src="/images/logo.png"
                alt="NigamSetu Logo"
                width={64}
                height={64}
                className="w-full h-full object-contain"
              />
            </div>
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Create your NigamSetu account</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Get started with Google or Email. Default role is Citizen.
          </p>
        </div>
        <Suspense
          fallback={
            <div className="w-full h-80 rounded-2xl border border-border bg-surface-card flex items-center justify-center text-sm text-muted animate-pulse">
              Loading sign-up...
            </div>
          }
        >
          <SignUp
            path="/sign-up"
            routing="path"
            signInUrl="/sign-in"
            appearance={{
              elements: {
                card: 'shadow-lg border border-border bg-surface-card rounded-2xl',
                headerTitle: 'hidden',
                headerSubtitle: 'hidden',
                formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-sm font-semibold py-2.5',
              },
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}
