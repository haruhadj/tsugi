import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { ProviderConnections } from "@/components/ProviderConnections";
import { UsernameField } from "@/components/UsernameField";
import { getServerSession } from "@/lib/auth";

export default async function SettingsPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen">
      <Header username={session.user.username ?? session.user.name} />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="animate-card-in">
          <p className="font-mono text-xs tracking-[0.28em] text-muted-foreground uppercase">
            Settings
          </p>
          <h1 className="mt-3 font-display text-[clamp(1.9rem,5vw,2.75rem)] leading-[1.02] font-extrabold tracking-[-0.03em]">
            Connected accounts
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Link a tracker to pull in titles you have already scored. Linking a second one
            never replaces the first.
          </p>

          {/*
            No brand-gradient rule on either card: settings is not an artifact, and
            spending the accent here would put it on the same screen as the header's
            active-nav underline for no reason.
          */}
          <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card/60">
            <div className="p-6 sm:p-8">
              <UsernameField initialUsername={session.user.username ?? ""} />
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card/60">
            <div className="p-6 sm:p-8">
              <ProviderConnections />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
