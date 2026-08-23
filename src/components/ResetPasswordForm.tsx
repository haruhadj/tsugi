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

// `token` comes from the ?token= query param better-auth's own
// /reset-password/:token GET redirect appends to redirectTo (src/lib/auth.ts's
// emailAndPassword.sendResetPassword receives the pre-redirect link; this page
// is what that redirect lands on). A missing/invalid token means the link was
// already used, expired, or malformed — surfaced the same way as any other
// error rather than as a separate state.
export function ResetPasswordForm({ token }: { token: string | undefined }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError(null);

    if (!token) {
      setError("This reset link is invalid or has expired.");
      return;
    }

    setPending(true);
    const newPassword = String(new FormData(formEvent.currentTarget).get("password") ?? "");
    const { error: resetError } = await authClient.resetPassword({ newPassword, token });
    setPending(false);
    if (resetError) {
      setError(resetError.message ?? "Couldn't reset your password.");
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push("/sign-in");
    }, 1500);
  }

  if (done) {
    return (
      <Alert>
        <AlertDescription>Password updated — redirecting you to sign in.</AlertDescription>
      </Alert>
    );
  }

  if (!token) {
    return (
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertDescription>
          This reset link is invalid or has expired.{" "}
          <Link href="/forgot-password" className="underline underline-offset-2">
            Request a new one
          </Link>
          .
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
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
        Reset password
      </Button>
    </form>
  );
}
