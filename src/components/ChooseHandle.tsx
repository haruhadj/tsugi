"use client";

import { useRouter } from "next/navigation";
import { UsernameField } from "@/components/UsernameField";

/**
 * The client half of the D49 handle gate: `UsernameField` plus "leave once it
 * saved". Split out so `/handle` itself stays a server component.
 *
 * `refresh()` before `replace()` matters — the session the gate reads is cached
 * for the request, so navigating without invalidating it would bounce the user
 * straight back here with a handle they just set.
 */
export function ChooseHandle() {
  const router = useRouter();

  return (
    <UsernameField
      initialUsername=""
      autoFocus
      saveLabel="Continue"
      onSaved={() => {
        router.refresh();
        router.replace("/");
      }}
    />
  );
}
