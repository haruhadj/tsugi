import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardRecList } from "@/components/DashboardRecList";
import { Wordmark } from "@/components/Wordmark";
import { getServerSession } from "@/lib/auth";
import { listRecommendationsForUser } from "@/server/services/recommendations";

// PHASE-8.md criterion 11 — a pure DB read, no provider/network calls, so
// this page works even with both tracker APIs down.
export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/sign-in");
  }

  const recs = await listRecommendationsForUser(session.user.id);

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-6 pt-8">
        <Link href="/">
          <Wordmark />
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-16">
        <div className="animate-card-in">
          <p className="font-mono text-xs tracking-[0.28em] text-muted-foreground uppercase">
            Dashboard
          </p>
          <h1 className="mt-4 font-display text-[clamp(1.9rem,5vw,2.75rem)] leading-[0.95] font-extrabold tracking-[-0.03em] uppercase">
            Your
            <br />
            recommendations
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
            Everything you have shared, newest first. Deleting one is immediate and total.
          </p>

          <div className="mt-10">
            <DashboardRecList initialRecs={recs} />
          </div>
        </div>
      </main>
    </div>
  );
}
