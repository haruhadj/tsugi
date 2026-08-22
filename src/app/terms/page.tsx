import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { LegalPage } from "@/components/LegalPage";
import { getServerSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Terms of Service — Tsugi",
};

// Public route, never gated (D55) — same rule as /r/[slug]: a policy page that
// requires sign-in defeats its own purpose, and a signed-out visitor is exactly
// who most needs to read this before creating an account.
export default async function TermsPage() {
  const session = await getServerSession();

  return (
    <div className="min-h-screen">
      <Header username={session ? (session.user.username ?? session.user.name) : null} />
      <LegalPage title="Terms of Service" updated="TODO — set the date this copy was published">
        <p>
          <strong>TODO:</strong> This page is a placeholder. Replace this content with the
          actual Terms of Service before linking it from sign-in or launching publicly — see
          <code>context/progress-tracker.md</code> D55. The copy is the product owner&apos;s to
          write; it is not legal advice and should not be drafted from a template without
          review.
        </p>
        <p>
          At minimum this should cover: what an account is for, what counts as acceptable
          content in a recommendation (comments, titles, media choices), that Tsugi may remove
          content or accounts, that recommendations are public once published, and how a user
          can delete their account and content.
        </p>
      </LegalPage>
    </div>
  );
}
