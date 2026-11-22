import { Suspense } from 'react';
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md flex flex-col items-center">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Create your NigamSetu account</h1>
          <p className="text-sm text-muted mt-1">
            Get started with Phone OTP or Email. Default role is Citizen.
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
