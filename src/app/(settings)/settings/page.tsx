import Link from "next/link";
import { redirect } from "next/navigation";
import { ProviderConnections } from "@/components/ProviderConnections";
import { UsernameField } from "@/components/UsernameField";
import { Wordmark } from "@/components/Wordmark";
import { getServerSession } from "@/lib/auth";

export default async function SettingsPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/sign-in");
  }

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
            Settings
          </p>
          <h1 className="mt-4 font-display text-[clamp(1.9rem,5vw,2.75rem)] leading-[0.95] font-extrabold tracking-[-0.03em] uppercase">
            Connected
            <br />
            accounts
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
            Link a tracker to pull in titles you have already scored. Linking a second one
            never replaces the first.
          </p>

          <div className="relative mt-10 overflow-hidden rounded-md border border-border bg-card">
            <div className="eyecatch-edge absolute inset-y-0 left-0 w-1" />
            <div className="p-8 pl-10 sm:pl-12">
              <UsernameField initialUsername={session.user.username ?? ""} />
            </div>
          </div>

          <div className="relative mt-6 overflow-hidden rounded-md border border-border bg-card">
            <div className="eyecatch-edge absolute inset-y-0 left-0 w-1" />
            <div className="p-8 pl-10 sm:pl-12">
              <ProviderConnections />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
