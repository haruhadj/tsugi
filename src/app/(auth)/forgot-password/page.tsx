import Link from "next/link";
import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import { Wordmark } from "@/components/Wordmark";
import { getServerSession } from "@/lib/auth";

export default async function ForgotPasswordPage() {
  const session = await getServerSession();
  if (session) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
      <div className="w-full max-w-md animate-card-in">
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
          <div className="flex flex-col gap-8 p-8 sm:p-10">
            <div className="flex flex-col gap-5">
              <Wordmark size="lg" />
              <div className="flex flex-col gap-2">
                <h1 className="font-display text-2xl leading-tight font-extrabold tracking-[-0.02em]">
                  Reset your password
                </h1>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Enter the email on your account and we&apos;ll send a reset link.
                </p>
              </div>
            </div>

            <ForgotPasswordForm />

            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/sign-in"
                className="text-foreground underline underline-offset-2 hover:no-underline"
              >
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
