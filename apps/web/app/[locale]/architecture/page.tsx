export const dynamic = "force-static";

export default function ArchitecturePage() {
  return (
    <main className="min-h-screen max-w-6xl mx-auto p-6 md:p-10">
      <header className="mb-8">
        <p className="ds-label mb-2">OnlineJourno · Architecture</p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Editorial-intelligence architecture
        </h1>
        <p
          className="text-base max-w-3xl"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
          }}
        >
          The four-layer design (ADR 0050): primary public-record sources →
          ingestion → AI triage (Analyse · Classify · Score) → the newsroom
          surfaces, by role — beat reporters, desk editors, investigations,
          news editors, the EIC. The signal feed, reporter inflows and Story
          Scores on this site are these layers, running.
        </p>
      </header>

      <div className="ds-frame p-2 overflow-auto">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/architecture.svg"
          alt="Editorial Intelligence Platform architecture: data sources feed an ingestion pipeline, then an AI triage layer, then the newsroom dashboard with alerts, serving newsroom roles"
          className="w-full h-auto"
        />
      </div>
    </main>
  );
}
