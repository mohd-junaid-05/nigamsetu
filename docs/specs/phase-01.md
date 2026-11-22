# Phase 1 — Auth and shell

**Goal.** Someone signs in, gets a role and ward claim, and lands somewhere that matches both, in the theme they prefer.

## Build

- **Sign-in with phone OTP and email via Clerk.** Signing in for the first time creates a profile row with role 'citizen' and no ward. There's a way for an admin to promote a citizen to official and assign a ward.
- **The current role and ward are readable during server rendering**, not only in the browser. The token carries a `role` and `ward_id` claim.
- A theme control with three states: follow the system, force light, force dark. Written to the root element so the colour tokens key off it.
- **The application shell everything later renders inside.** Three main entry points: the citizen report view (mobile-first), the public map (anyone), and the official dashboard (desktop-first).
- Signed-out visitors to a protected route get sent to the login screen before anything renders.
- PWA manifest and service worker registration so `/report` works standalone on a phone.

## Constraints

- **Identity is a token, and the token carries the ward/role claim.** Everything built after this decides what someone can see by reading that claim. Nothing downstream should ever have to ask the identity provider a question at runtime.
- Use what Clerk already provides rather than rebuilding it. If a hand-written login form appears in this phase, something has gone wrong.
- **One session system, not two.** Whatever the Supabase client setup snippet installs for refreshing its own sessions comes out. Sessions belong to Clerk. Two things trying to own the same cookie and the same middleware slot is a bug that presents as random sign-outs.
- **The Supabase client carries the signed-in token.** Nothing queries anything yet, but the client has to be constructed so the Clerk JWT travels with every request, because that's what makes the claims readable inside an RLS policy later. A client wired up anonymously looks completely fine until the first policy exists, and then returns nothing.
- Environment configuration fails loudly at startup if it's missing. A blank value that produces a confusing error three screens later is worse than a crash on boot.
- Nothing here creates a table.

## Acceptance check

1. Sign in with phone OTP. Land in the app with role 'citizen' and no ward. The profile row exists in the database.
2. Sign in with email. Same result -- same landing, same role, no conflict.
3. Read the current role in a server component and render it. It's there on the first paint, not after a client-side hydration.
4. Switch the theme, reload, the choice is still there. All three states work, and forcing light while the system is dark actually wins.
5. Visit `/dashboard` while signed out, get redirected to login. Confirm in the network tab that the page's HTML was never sent.
6. The PWA prompt appears on a phone visiting `/report`. The icon installs and opens standalone.

## Not in this phase

Any table. Roles beyond the defaults that come out of the box. Styling the sign-in screen beyond making it match the rest of the app. Any map component. Any AI call.

---