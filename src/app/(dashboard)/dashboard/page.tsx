import Link from "next/link";
import { DashboardRecList } from "@/components/DashboardRecList";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { requireHandledSession } from "@/lib/require-handle";
import { getDashboardStats, listListsForUser } from "@/server/services/lists";

// PHASE-8.md criterion 11 — a pure DB read, no provider/network calls, so
// this page works even with both tracker APIs down.
export default async function DashboardPage() {
  // Redirects to /sign-in without a session, or to /handle without a username (D49).
  const session = await requireHandledSession();

  const [recs, stats] = await Promise.all([
    listListsForUser(session.user.id),
    getDashboardStats(session.user.id),
  ]);

  const summary = [
    { label: "Lists", value: stats.listCount },
    { label: "Views", value: stats.totalViews },
    { label: "Net votes", value: stats.totalScore },
    { label: "Titles curated", value: stats.totalItems },
  ];

  return (
    <div className="min-h-screen">
      <Header username={session.user.username ?? session.user.name} />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="animate-card-in">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs tracking-[0.28em] text-muted-foreground uppercase">
                u/{session.user.username}
              </p>
              <h1 className="mt-3 font-display text-[clamp(1.9rem,5vw,2.75rem)] leading-[1.02] font-extrabold tracking-[-0.03em]">
                Your lists
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                Find what you have made, share a link, or manage what appears on the rundown.
              </p>
            </div>
            <Button asChild className="rounded-full">
              <Link href="/">Make a list</Link>
            </Button>
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-5 rounded-2xl border border-border bg-card/60 p-5 sm:grid-cols-4 sm:p-6">
            {summary.map((item) => (
              <div key={item.label}>
                <dt className="text-xs text-muted-foreground">{item.label}</dt>
                <dd className="mt-1 font-mono text-2xl leading-none font-bold tabular-nums text-foreground">
                  {item.value.toLocaleString()}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-8">
            <DashboardRecList initialRecs={recs} />
          </div>
        </div>
      </main>
    </div>
  );
}
