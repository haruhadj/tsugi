import { redirect } from "next/navigation";
import { ProviderConnections } from "@/components/ProviderConnections";
import { getServerSession } from "@/lib/auth";

export default async function SettingsPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/sign-in");
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-8 bg-background px-4 py-16 text-foreground">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <h1 className="text-xl font-semibold">Connected accounts</h1>
        <ProviderConnections />
      </div>
    </main>
  );
}
