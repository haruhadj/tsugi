import { ArrowUpIcon, EyeIcon, LayersIcon, ListOrderedIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardRecList } from "@/components/DashboardRecList";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { getServerSession } from "@/lib/auth";
import { getDashboardStats, listListsForUser } from "@/server/services/lists";

// PHASE-8.md criterion 11 — a pure DB read, no provider/network calls, so
// this page works even with both tracker APIs down.
export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/sign-in");
  }

  const [recs, stats] = await Promise.all([
    listListsForUser(session.user.id),
    getDashboardStats(session.user.id),
  ]);

  const tiles = [
    { label: "Lists", value: stats.listCount, icon: LayersIcon, tone: "text-primary" },
    { label: "Views", value: stats.totalViews, icon: EyeIcon, tone: "text-score-good" },
    { label: "Net votes", value: stats.totalScore, icon: ArrowUpIcon, tone: "text-success" },
    {
      label: "Titles curated",
      value: stats.totalItems,
      icon: ListOrderedIcon,
      tone: "text-highlight",
    },
  ];

  return (
    <div className="min-h-screen">
      <Header username={session.user.username ?? session.user.name} />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="animate-card-in">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs tracking-[0.28em] text-muted-foreground uppercase">
                Dashboard
              </p>
              <h1 className="mt-3 font-display text-[clamp(1.9rem,5vw,2.75rem)] leading-[1.02] font-extrabold tracking-[-0.03em]">
                Your lists
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                Everything you have made, newest first. Publishing a list puts it on the
                rundown; deleting one is immediate and total.
              </p>
            </div>
            <Button asChild className="rounded-full">
              <Link href="/">Make a list</Link>
            </Button>
          </div>

          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tiles.map((tile) => (
              <li
                key={tile.label}
                className="rounded-2xl border border-border bg-card/60 p-4"
              >
                <tile.icon className={`size-4 ${tile.tone}`} aria-hidden />
                <p className="mt-3 font-mono text-2xl leading-none font-bold tabular-nums">
                  {tile.value.toLocaleString()}
                </p>
                <p className="mt-1.5 font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                  {tile.label}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-8">
            <DashboardRecList initialRecs={recs} />
          </div>
        </div>
      </main>
    </div>
  );
}
