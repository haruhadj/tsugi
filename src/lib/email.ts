import "server-only";
import { Resend } from "resend";
import { getEnv } from "@/lib/env";

// Lazy, mirroring getEnv() — constructing Resend at module load would run
// before env.ts's lazy-validation guard applies, breaking test collection
// the same way eager getEnv() did (see the CI fix in src/lib/env.ts).
let cachedClient: Resend | undefined;

function getResendClient(): Resend {
  cachedClient ??= new Resend(getEnv().RESEND_API_KEY);
  return cachedClient;
}

export async function sendVerificationEmail(to: string, url: string) {
  const env = getEnv();
  await getResendClient().emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: "Verify your email — Tsugi",
    html: `<p>Confirm this is your email address to finish setting up your Tsugi account.</p>
<p><a href="${url}">Verify email</a></p>
<p>If you didn't create a Tsugi account, you can ignore this email.</p>`,
  });
}

export async function sendResetPasswordEmail(to: string, url: string) {
  const env = getEnv();
  await getResendClient().emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: "Reset your password — Tsugi",
    html: `<p>Someone requested a password reset for this Tsugi account.</p>
<p><a href="${url}">Reset password</a></p>
<p>If you didn't request this, you can ignore this email — your password won't change.</p>`,
  });
}
