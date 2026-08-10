import { genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Browser-side only — no secrets, isomorphic-safe (architecture.md).
// AniList and MyAnimeList are genericOAuth providers, so linking one uses
// `authClient.oauth2.link()`, not `linkSocial()` — that method is for
// built-in social providers only (Google, once it's wired in). Found while
// implementing Phase 2; the blueprint's prose used "linkSocial" loosely
// for both cases.
export const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
});
