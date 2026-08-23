import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { Wordmark } from "@/components/Wordmark";

export default async function ResetPasswordPage({
  searchParams,
}: {
  // Next 16: searchParams is a Promise (context/tech-stack.md).
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
      <div className="w-full max-w-md animate-card-in">
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
          <div className="flex flex-col gap-8 p-8 sm:p-10">
            <div className="flex flex-col gap-5">
              <Wordmark size="lg" />
              <div className="flex flex-col gap-2">
                <h1 className="font-display text-2xl leading-tight font-extrabold tracking-[-0.02em]">
                  Set a new password
                </h1>
              </div>
            </div>

            <ResetPasswordForm token={token} />
          </div>
        </div>
      </div>
    </main>
  );
}
