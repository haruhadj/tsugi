import type { CSSProperties } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ListBuilder } from "@/components/ListBuilder";
import { ArrowRightIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { HANDLE_ROUTE } from "@/lib/require-handle";
import { Filmstrip } from "@/components/feed/Filmstrip";
import { listPublishedFeed } from "@/server/services/lists";

// The hero says the product's name before it says anything else, and it says it the
// way the product is named: 次 — "next". Each letter is its own element so the run
// can be staggered, and the kanji lands last, on the end of it. Splitting the string
// here rather than at the call site keeps the markup one map and the name one word.
const NAME = "Tsugi".split("");

// Every entrance on this hero is one sequence, so the delays are written down once
// and read in order instead of being scattered across the JSX as arbitrary values.
// The wordmark is not in here: its timing is two animations deep and stays with the
// `.hero-glyph` / `.hero-kanji` rules in globals.css, driven by --glyph-i alone.
const ENTER = {
  deck: "330ms",
  blurb: "410ms",
  action: "490ms",
  card: "570ms",
} as const;

// The create flow really is ordered — you cannot score a title you have not picked,
// and the link does not exist until both are done. That is why these carry step
// markers; nothing else on the page does.
const STEPS = [
  { marker: "01", title: "Pick" },
  { marker: "02", title: "Score" },
  { marker: "03", title: "Share" },
] as const;

export default async function Home() {
  const session = await getServerSession();

  // Not `requireHandledSession()`: signed out, this page is the product's
  // marketing front rather than a redirect to sign-in, so only the signed-in
  // branch is gated (D49).
  if (session && !session.user.username) {
    redirect(HANDLE_ROUTE);
  }

  if (session) {
    return (
      <div className="min-h-screen">
        <Header username={session.user.username ?? session.user.name} />

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
          <div className="animate-card-in">
            <div className="mb-8 border-b border-border pb-6">
              <p className="font-display text-[clamp(1.8rem,4vw,2.7rem)] leading-tight font-extrabold tracking-[-0.03em] text-foreground">Make something worth sharing.</p>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">Bring your favorite titles together, add what you think, and send one link.</p>
            </div>

            <div>
              <ListBuilder />
            </div>
          </div>
        </main>
      </div>
    );
  }

  const [featuredList] = await listPublishedFeed({
    page: 1,
    pageSize: 1,
    sort: "top",
    viewerId: null,
  });

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex min-h-svh max-w-7xl flex-col px-4 sm:px-6">
        <nav className="flex items-center justify-between gap-4 border-b border-border py-5" aria-label="Main navigation">
          <Link href="/" className="font-display text-xl font-extrabold tracking-tight text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            Tsugi<span className="text-primary">次</span>
          </Link>
          <div className="flex items-center gap-4 sm:gap-6">
            <Link href="/feed" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">Explore lists</Link>
            <Button asChild size="sm"><Link href="/sign-in">Sign in</Link></Button>
          </div>
        </nav>

        <section className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-16 lg:py-20">
          <div className="max-w-2xl">
            <h1 className="font-display font-extrabold text-foreground">
              <span className="flex items-start text-[clamp(3.5rem,8vw,6.5rem)] leading-[0.95] tracking-[-0.04em]" aria-label="Tsugi">
                {NAME.map((letter, i) => (
                  <span key={`${letter}-${i}`} className="hero-glyph" style={{ "--glyph-i": i } as CSSProperties} aria-hidden>{letter}</span>
                ))}
                <span className="hero-kanji ml-3 text-[0.3em] leading-none tracking-normal text-primary" aria-hidden>次</span>
              </span>
              <span className="animate-card-in mt-7 block max-w-xl text-[clamp(1.8rem,3.5vw,3rem)] leading-[1.08] tracking-[-0.03em]" style={{ animationDelay: ENTER.deck }}>
                Your next great watch starts with someone&apos;s taste.
              </span>
            </h1>

            <p className="animate-card-in mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg" style={{ animationDelay: ENTER.blurb }}>
              Pick the anime or manga you love, add your scores and notes, and send it all in one link. Anyone can open it.
            </p>

            <div className="animate-card-in mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: ENTER.action }}>
              <Button asChild size="lg"><Link href="/sign-in">Make a list <ArrowRightIcon className="size-4" aria-hidden /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="/feed">Explore lists</Link></Button>
            </div>

            <ol className="animate-card-in mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t border-border pt-5 text-sm text-muted-foreground" style={{ animationDelay: ENTER.action }}>
              {STEPS.map((step) => (
                <li key={step.marker} className="flex items-center gap-2"><span className="font-mono text-primary">{step.marker}</span>{step.title}</li>
              ))}
            </ol>
          </div>

          <div className="animate-card-in" style={{ animationDelay: ENTER.card }}>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-5 py-4">
                <span className="text-sm font-semibold text-foreground">What a shared list looks like</span>
                <span className="font-mono text-xs text-muted-foreground">tsugi / r</span>
              </div>
              {featuredList ? (
                <div className="p-5 sm:p-7">
                  <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                    <span className="rounded-full bg-primary/15 px-2.5 py-1 font-medium text-primary">{featuredList.category}</span>
                    <span>{featuredList.itemCount} {featuredList.itemCount === 1 ? "title" : "titles"}</span>
                  </div>
                  <h2 className="mt-5 font-display text-2xl leading-tight font-bold text-foreground sm:text-3xl">{featuredList.name}</h2>
                  {featuredList.caption && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{featuredList.caption}</p>}
                  {featuredList.authorUsername && <p className="mt-3 text-xs text-muted-foreground">by u/{featuredList.authorUsername}</p>}
                  <div className="mt-7"><Filmstrip covers={featuredList.covers} limit={5} /></div>
                  <Link href={`/r/${featuredList.slug}`} className="mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">Open this list <ArrowRightIcon className="size-4" aria-hidden /></Link>
                </div>
              ) : (
                <div className="p-6 sm:p-8">
                  <h2 className="font-display text-2xl font-bold text-foreground">A list worth sharing.</h2>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">Choose your titles, rate them your way, and add the notes that make the recommendation yours.</p>
                  <div className="mt-8 grid grid-cols-3 gap-2" aria-hidden>
                    <div className="aspect-[2/3] rounded-lg bg-secondary" />
                    <div className="aspect-[2/3] rounded-lg bg-primary/20" />
                    <div className="aspect-[2/3] rounded-lg bg-secondary" />
                  </div>
                  <p className="mt-7 border-t border-border pt-5 text-sm text-muted-foreground">Publish once. Share the link anywhere.</p>
                </div>
              )}
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">A shared list opens for anyone, with no sign in required.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
