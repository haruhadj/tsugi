"use client";

import { AlertCircleIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

// Shared by both the sign-in and sign-up routes — the two forms differ only
// by a "name" field and which better-auth call they make, so one component
// with a `mode` prop avoids duplicating the pending/error plumbing twice.
export function EmailPasswordForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Shown only after a successful sign-up, since the account exists at that
  // point but isn't usable until the verification link is clicked.
  const [awaitingVerification, setAwaitingVerification] = useState(false);

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(formEvent.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    if (mode === "sign-up") {
      const name = String(form.get("name") ?? "");
      const { error: signUpError } = await authClient.signUp.email({ name, email, password });
      setPending(false);
      if (signUpError) {
        setError(signUpError.message ?? "Couldn't create your account.");
        return;
      }
      setAwaitingVerification(true);
      return;
    }

    const { error: signInError } = await authClient.signIn.email({ email, password });
    setPending(false);
    if (signInError) {
      setError(signInError.message ?? "Couldn't sign you in.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  if (awaitingVerification) {
    return (
      <Alert>
        <AlertDescription>
          Check your email for a link to verify your address — you&apos;ll be signed in
          automatically once you click it.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {mode === "sign-up" ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" autoComplete="name" required disabled={pending} />
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          {mode === "sign-in" ? (
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          ) : null}
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          minLength={mode === "sign-up" ? 8 : undefined}
          required
          disabled={pending}
        />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
        {mode === "sign-up" ? "Create account" : "Sign in"}
      </Button>
    </form>
  );
}
