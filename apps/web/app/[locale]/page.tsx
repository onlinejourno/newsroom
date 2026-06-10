import Image from "next/image";
import Link from "next/link";

const SURFACES = [
  {
    href: "signals",
    title: "Signals",
    desc: "The enriched inflow — every public-record item with beat, place, entities and the reader need it serves.",
    label: "Collect · Analyse · Classify",
  },
  {
    href: "journalists",
    title: "Reporter inflows",
    desc: "The directory routes each signal to the reporter on the beat — open a correspondent to see her personal feed.",
    label: "Route",
  },
  {
    href: "shortlist",
    title: "Shortlist",
    desc: "Scored picks for the desk — what deserves attention now, with the why.",
    label: "Score",
  },
  {
    href: "brief",
    title: "Morning brief",
    desc: "The composed editorial brief, built from the scored inflow.",
    label: "Deliver",
  },
  {
    href: "admin/sources",
    title: "Admin",
    desc: "Sources, connectors (CMS · NLP · keywords), and the optimization-surface registry.",
    label: "Configure",
  },
] as const;

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 py-16">
      <div className="max-w-3xl w-full text-center">
        <Image
          src="/brand/logo-mark.png"
          alt="OnlineJourno"
          width={120}
          height={120}
          priority
          className="mx-auto mb-8"
        />

        <p className="ds-label mb-4">OnlineJourno · Platform</p>

        <h1
          className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight mb-6"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Give every story
          <br />a fair chance.
        </h1>

        <p
          className="text-lg md:text-xl mb-10"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
            lineHeight: 1.55,
          }}
        >
          The platform connects the newsroom&rsquo;s CMS to the outside world
          and makes the two ends talk: public signals flow in to the reporter
          on the beat; her published story is audited for the fair chance it
          deserves on every distribution surface.
        </p>

        <hr className="ds-rule my-10" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          {SURFACES.map((s) => (
            <Link
              key={s.href}
              href={`/${locale}/${s.href}`}
              className="rounded-sm border p-4 block hover:shadow-sm transition-shadow"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-bg-card)",
              }}
            >
              <p className="ds-label mb-1">{s.label}</p>
              <p
                className="text-lg font-bold mb-1"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {s.title}
              </p>
              <p
                className="text-sm"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-fg-secondary)",
                  lineHeight: 1.5,
                }}
              >
                {s.desc}
              </p>
            </Link>
          ))}
        </div>

        <hr className="ds-rule my-10" />

        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
          style={{ fontFamily: "var(--font-ui)" }}
        >
          <div>
            <p className="ds-label mb-2">Backbone</p>
            <p
              className="font-semibold text-sm"
              style={{ color: "var(--color-fg-primary)" }}
            >
              Collect → Analyse → Classify → Route → Score
            </p>
          </div>
          <div>
            <p className="ds-label mb-2">Grounding</p>
            <p
              className="font-semibold text-sm"
              style={{ color: "var(--color-fg-primary)" }}
            >
              Deuze · PEJ frames · User Needs
            </p>
          </div>
          <div>
            <p className="ds-label mb-2">Maintainer</p>
            <p
              className="font-semibold text-sm"
              style={{ color: "var(--color-fg-primary)" }}
            >
              Subhash Rai (solo)
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
