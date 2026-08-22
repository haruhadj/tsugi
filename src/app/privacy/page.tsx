import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { LegalPage } from "@/components/LegalPage";
import { getServerSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Privacy Policy — Tsugi",
};

// Public route, never gated (D55) — same rule as /r/[slug]: a policy page that
// requires sign-in defeats its own purpose.
export default async function PrivacyPage() {
  const session = await getServerSession();

  return (
    <div className="min-h-screen">
      <Header username={session ? (session.user.username ?? session.user.name) : null} />
      <LegalPage title="Privacy Policy" updated="TODO — set the date this copy was published">
        <p>
          <strong>TODO:</strong> This page is a placeholder. Replace this content with the
          actual Privacy Policy before linking it from sign-in or launching publicly — see
          <code>context/progress-tracker.md</code> D55. The copy is the product owner&apos;s to
          write; it is not legal advice and should not be drafted from a template without
          review.
        </p>
        <p>
          At minimum this should cover: what is stored (OAuth provider tokens, session data,
          recommendations and comments a user creates, view counts), that provider access
          tokens are server-only and never exposed to the client (invariant 10), what
          third-party services are involved (Supabase, Upstash Redis, AniList, MyAnimeList),
          and how a user can request deletion of their account and data.
        </p>
      </LegalPage>
    </div>
  );
}
