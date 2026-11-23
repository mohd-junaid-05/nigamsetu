'use client';

import { useUser, SignInButton, UserButton } from '@clerk/nextjs';

export function HeaderAuth() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return <div className="w-7 h-7 rounded-full bg-white/10 animate-pulse" />;
  }

  return (
    <div className="flex items-center">
      {isSignedIn ? (
        <UserButton
          appearance={{
            elements: { userButtonAvatarBox: 'w-7 h-7' },
          }}
        />
      ) : (
        <SignInButton mode="modal">
          <button
            type="button"
            className="px-3 py-1 text-xs font-semibold rounded bg-[#1d70b8] text-white hover:bg-[#144e82] active:scale-[0.98] transition-all cursor-pointer"
          >
            Sign In
          </button>
        </SignInButton>
      )}
    </div>
  );
}
