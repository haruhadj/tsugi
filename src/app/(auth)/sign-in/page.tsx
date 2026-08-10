import { SignInButtons } from "@/components/SignInButtons";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-foreground">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-xl font-semibold">Sign in to Tsugi</h1>
          <p className="text-sm text-foreground/60">
            A tracker account unlocks importing your list later.
          </p>
        </div>
        <SignInButtons />
      </div>
    </main>
  );
}
