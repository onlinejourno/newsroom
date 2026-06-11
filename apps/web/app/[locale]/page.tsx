import Image from "next/image";
import Link from "next/link";

// The five rooms of the story lifecycle (ADR 0053), each with who stands in
// it and what question it answers. The front door routes by role, not tool.
const ROOMS = [
  {
    href: "signals",
    room: "① Today",
    who: "Reporter · Bureau chief · Editor",
    title: "What is going on",
    desc: "The public record flowing in — governments, courts, tenders, wires — analysed, classified and routed to the reporter on the beat, with alerts. Potential tells her what to take up first: trending now, likely to trend today.",
    links: [
      { href: "potential", label: "Potential" },
      { href: "trends", label: "Trends" },
      { href: "journalists", label: "Reporter feeds" },
    ],
  },
  {
    href: "scores",
    room: "② Stories",
    who: "Desk · Reporter",
    title: "A fair chance on every surface",
    desc: "Once published, is the story built for each surface — Discover, News, Search, and the AI surfaces each reading in their own way? Automatic audits, paste-a-URL checks, and the hidden gems the night desk buried.",
    links: [
      { href: "gems", label: "Hidden gems" },
      { href: "scores", label: "Audit a URL" },
    ],
  },
  {
    href: "probity",
    room: "③ Standards",
    who: "Everyone",
    title: "Probity and verification",
    desc: "What the page does to the reader — trackers, consent honesty, weight — seared into the workflow. Factcheck joins here. The conscience dashboards: reader-need mix and framing balance.",
    links: [{ href: "signals", label: "Need mix" }],
  },
  {
    href: "gaps",
    room: "④ Newsroom",
    who: "Editor · Vertical heads",
    title: "People and strategy",
    desc: "Who covers what, where the record moves with no reporter on it, and — coming — the masthead's strategic topics and what its subscribers actually read.",
    links: [{ href: "journalists", label: "Directory" }],
  },
  {
    href: "scores",
    room: "⑤ Learn",
    who: "Everyone new to digital",
    title: "The medium, explained inside the tool",
    desc: "Assistive for those who don't know, a workhorse for the cognoscenti: every score, frame and surface explains itself. Start with the explainers on Potential and Scores; the full learning layer (m-learn) is being built.",
    links: [{ href: "potential", label: "See an explainer" }],
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
          width={110}
          height={110}
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
          One place where everyone in the newsroom — rookie to editor — sees
          what is going on and what needs to be done: the original sources in,
          the story&rsquo;s fair chance out. About journalism, by journalists,
          for journalists. Open source.
        </p>

        <hr className="ds-rule my-10" />

        <div className="grid grid-cols-1 gap-4 text-left">
          {ROOMS.map((r) => (
            <div
              key={r.room}
              className="rounded-sm border p-5"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-bg-card)",
              }}
            >
              <div
                className="flex items-baseline justify-between gap-3 flex-wrap mb-1"
                style={{ fontFamily: "var(--font-ui)" }}
              >
                <p className="ds-label">{r.room}</p>
                <span
                  className="text-xs"
                  style={{ color: "var(--color-fg-tertiary)" }}
                >
                  {r.who}
                </span>
              </div>
              <Link
                href={`/${locale}/${r.href}`}
                className="text-xl font-bold hover:underline"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {r.title}
              </Link>
              <p
                className="text-sm mt-1"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-fg-secondary)",
                  lineHeight: 1.5,
                }}
              >
                {r.desc}
              </p>
              <p
                className="text-sm mt-2 flex gap-4 flex-wrap"
                style={{ fontFamily: "var(--font-ui)" }}
              >
                {r.links.map((l) => (
                  <Link
                    key={l.label}
                    href={`/${locale}/${l.href}`}
                    className="underline"
                    style={{ color: "var(--color-brand)" }}
                  >
                    {l.label}
                  </Link>
                ))}
              </p>
            </div>
          ))}
        </div>

        <hr className="ds-rule my-10" />

        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
          style={{ fontFamily: "var(--font-ui)" }}
        >
          <div>
            <p className="ds-label mb-2">The loop</p>
            <p
              className="font-semibold text-sm"
              style={{ color: "var(--color-fg-primary)" }}
            >
              Sources → Analyse → Classify → Route → Alert → Publish → Audit
            </p>
          </div>
          <div>
            <p className="ds-label mb-2">Grounding</p>
            <p
              className="font-semibold text-sm"
              style={{ color: "var(--color-fg-primary)" }}
            >
              PEJ framing · Deuze · User Needs
            </p>
          </div>
          <div>
            <p className="ds-label mb-2">Licence</p>
            <p
              className="font-semibold text-sm"
              style={{ color: "var(--color-fg-primary)" }}
            >
              Apache 2.0 — run it in your newsroom
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
