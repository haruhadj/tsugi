"use client";

import { MailIcon } from "lucide-react";
import { useState } from "react";
import { EmailPasswordForm } from "@/components/EmailPasswordForm";
import { Button } from "@/components/ui/button";

// Sign-in only: the OAuth buttons above already cover the low-friction path,
// so the email form starts collapsed behind this and only mounts once asked
// for. Sign-up keeps the form inline — creating an account is the one path
// without an OAuth shortcut, so there is nothing to default away from.
export function EmailSignInToggle() {
  const [revealed, setRevealed] = useState(false);

  if (!revealed) {
    return (
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="justify-center gap-2.5"
        onClick={() => setRevealed(true)}
      >
        <MailIcon className="size-4" aria-hidden />
        Continue with email
      </Button>
    );
  }

  return <EmailPasswordForm mode="sign-in" />;
}
