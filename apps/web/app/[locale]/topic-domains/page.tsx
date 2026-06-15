export const dynamic = "force-static";

export default async function TopicDomainsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  return (
    <main className="min-h-screen max-w-3xl mx-auto p-6 md:p-10">
      <header className="mb-6">
        <p className="ds-label mb-2">OnlineJourno · Topic → Domains</p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Topic → Domains
        </h1>
        <p
          className="text-base max-w-2xl"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
          }}
        >
          For any topic, which domains own it — who&rsquo;s ranking and winning
          the conversation, so you see who you&rsquo;re up against.
        </p>
        <p
          className="text-sm mt-4"
          style={{
            fontFamily: "var(--font-ui)",
            color: "var(--color-fg-tertiary)",
          }}
        >
          Coming in a later slice.
        </p>
      </header>
    </main>
  );
}
