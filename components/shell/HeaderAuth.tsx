'use client';

import { useUser, SignInButton, UserButton } from '@clerk/nextjs';

export function HeaderAuth() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />;
  }

  return (
    <div className="flex items-center">
      {isSignedIn ? (
        <UserButton
          appearance={{
            elements: {
              userButtonAvatarBox: 'w-8 h-8 ring-2 ring-white/20 hover:ring-[#FFB81D] transition-all',
            },
          }}
        />
      ) : (
        <SignInButton mode="modal">
          <button
            type="button"
            className="px-3.5 py-1.5 text-xs font-bold rounded bg-white/15 text-white border border-white/20 hover:bg-white/25 active:scale-95 transition-all cursor-pointer shadow-xs"
          >
            Sign In
          </button>
        </SignInButton>
      )}
    </div>
  );
}
