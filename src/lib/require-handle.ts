import "server-only";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";

/** Where an author without a handle is sent to choose one. */
export const HANDLE_ROUTE = "/handle";

/**
 * The session an authenticated screen needs, with the D49 handle gate applied.
 *
 * A handle is mandatory for anyone who publishes, because it is the attribution
 * every list carries on the rundown. Rather than backfilling one from an OAuth
 * display name — a public identity the person never chose — accounts that predate
 * D49 are stopped here, once, and asked to pick.
 *
 * **Authenticated screens only.** `/feed`, `/r/[slug]`, and the OG image must
 * never call this: viewing has never required an account (invariant 9), and a
 * gate on a public route would break the one thing the product is for. Their
 * author line simply renders nothing for a handle-less owner.
 */
export async function requireHandledSession() {
  const session = await getServerSession();
  if (!session) redirect("/sign-in");
  if (!session.user.username) redirect(HANDLE_ROUTE);
  return session;
}
