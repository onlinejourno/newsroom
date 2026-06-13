export const dynamic = "force-static";

// Compliance checkpoints for news websites, each mapped to what the probity
// audit (ADR 0052) detects. Not legal advice — a desk-level checklist.
const POINTS: { law: string; rule: string; probity: string }[] = [
  {
    law: "GDPR Art. 6/7 · DPDPA §6",
    rule: "Consent before non-essential trackers. No advertising/analytics tags may fire before the reader consents.",
    probity: "Consent-timing audit flags pre-consent third-party requests.",
  },
  {
    law: "GDPR Art. 5(1)(b) · purpose limitation",
    rule: "Reader identity must not be broadcast to ad buyers without a lawful basis.",
    probity: "RTB-cascade detection: who receives the bid-stream and when.",
  },
  {
    law: "DPDPA §8 · ePrivacy",
    rule: "Social pixels track readers who never used the platform — disclose or remove.",
    probity: "Tracker inventory tags social/advertising pixels by severity.",
  },
  {
    law: "GDPR Art. 13/14 · transparency",
    rule: "A reachable, honest privacy notice and a CMP that actually gates.",
    probity: "CMP detection + whether it blocks tags until acceptance.",
  },
  {
    law: "Accessibility / access equity",
    rule: "Page weight is an access barrier on metered mobile data — a democratic-access issue, not just performance.",
    probity: "Page-weight + bloat score; the 'democratic infrastructure' grade.",
  },
];

export default async function StandardsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <main className="min-h-screen max-w-4xl mx-auto p-6 md:p-10">
      <header className="mb-8">
        <p className="ds-label mb-2">OnlineJourno · Standards</p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Compliance &amp; ethical destination
        </h1>
        <p
          className="text-base max-w-3xl"
          style={{ fontFamily: "var(--font-body)", color: "var(--color-fg-secondary)" }}
        >
          What a reader-respecting news website owes its audience under GDPR,
          India&rsquo;s DPDPA, and digital-news norms — and how the{" "}
          <a className="underline" href={`/${locale}/probity`}>
            probity audit
          </a>{" "}
          checks each. A desk checklist, not legal advice.
        </p>
      </header>

      <table className="w-full text-sm" style={{ fontFamily: "var(--font-ui)" }}>
        <thead>
          <tr
            className="text-xs uppercase tracking-wide text-left"
            style={{ color: "var(--color-fg-tertiary)" }}
          >
            <th className="py-2 pr-3">Law</th>
            <th className="py-2 pr-3">What it requires</th>
            <th className="py-2 pr-3">How probity checks it</th>
          </tr>
        </thead>
        <tbody>
          {POINTS.map((p) => (
            <tr key={p.law} className="border-t align-top" style={{ borderColor: "var(--color-border)" }}>
              <td className="py-2 pr-3 font-semibold whitespace-nowrap">{p.law}</td>
              <td className="py-2 pr-3" style={{ color: "var(--color-fg-secondary)" }}>
                {p.rule}
              </td>
              <td className="py-2 pr-3" style={{ color: "var(--color-fg-secondary)" }}>
                {p.probity}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <a
        href={`/${locale}/probity`}
        className="inline-block mt-6 px-4 py-2 rounded-sm text-sm font-semibold no-underline"
        style={{ background: "var(--color-brand)", color: "white" }}
      >
        Run a probity audit →
      </a>
    </main>
  );
}
