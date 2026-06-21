import type { Route } from "next";
import { redirect } from "next/navigation";
import { startDemoSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Public entry: start a read-only demo-viewer session, then land in the surfaces.
export default async function ShowcasePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const room = await startDemoSession("demo");
  if (!room) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="ds-deck">The demo isn&rsquo;t available right now.</p>
      </main>
    );
  }
  redirect(`/${locale}/${room}` as Route);
}
