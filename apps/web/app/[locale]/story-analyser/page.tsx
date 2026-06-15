export const dynamic = "force-static";

export default async function StoryAnalyserPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  return (
    <main className="min-h-screen max-w-3xl mx-auto p-6 md:p-10">
      <header className="mb-6">
        <p className="ds-label mb-2">OnlineJourno · Story Analyser</p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Story Analyser
        </h1>
        <p
          className="text-base max-w-2xl"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
          }}
        >
          Audit one story end to end — the full SEO + E-E-A-T breakdown:
          channel scores (Discover/News/Search/AIO), SQEG, the SEJ periodic
          table, recirculation, Core Web Vitals. The scoring engine is built;
          wiring the page next.
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
