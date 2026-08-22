import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { ChooseHandle } from "@/components/ChooseHandle";
import { Wordmark } from "@/components/Wordmark";
import { getServerSession } from "@/lib/auth";

/**
 * The one-time handle step (D49).
 *
 * Reached only by redirect from `requireHandledSession()`. Anyone who already has
 * a handle is bounced back out, so this can never become a second place to edit
 * one — that lives in `/settings`, where it belongs.
 */
export default async function HandlePage() {
  const session = await getServerSession();
  if (!session) redirect("/sign-in");
  if (session.user.username) redirect("/");

  return (
    <div className="min-h-screen">
      <Header username={null} />

      <main className="mx-auto flex max-w-md flex-col px-6 py-16">
        <div className="animate-card-in overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
          <div className="flex flex-col gap-6 p-6 sm:p-8">
            <Wordmark size="lg" />

            <div className="flex flex-col gap-2">
              <h1 className="font-display text-2xl leading-tight font-extrabold tracking-[-0.02em]">
                Pick your handle
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Every list you publish is signed with it, so readers can tell whose
                recommendation they are looking at. You can change it later in settings.
              </p>
            </div>

            {/*
              Seeded empty rather than from the OAuth display name: a name from a
              tracker profile is not a handle someone chose, and pre-filling one
              makes accepting it the path of least resistance.
            */}
            <ChooseHandle />
          </div>
        </div>
      </main>
    </div>
  );
}
