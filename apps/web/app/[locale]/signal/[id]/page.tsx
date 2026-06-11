import Link from "next/link";

import { SignalChips } from "@/components/SignalChips";
import {
  archiveMatches,
  journalistsForSignal,
  signalById,
  tenantIdForSlug,
} from "@/lib/db";

export const dynamic = "force-dynamic";

const TENANT_SLUG = "self";

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function Stage({
  label,
  by,
  children,
}: {
  label: string;
  by: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-sm border p-4"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-bg-card)",
      }}
    >
      <div
        className="flex items-baseline justify-between gap-2 mb-2"
        style={{ fontFamily: "var(--font-ui)" }}
      >
        <p className="ds-label">{label}</p>
        <span className="text-xs" style={{ color: "var(--color-fg-tertiary)" }}>
          {by}
        </span>
      </div>
      <div className="text-sm" style={{ fontFamily: "var(--font-body)" }}>
        {children}
      </div>
    </section>
  );
}

export default async function SignalDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const tenantId = await tenantIdForSlug(TENANT_SLUG);
  const signal = tenantId ? await signalById(tenantId, id) : null;

  if (!signal) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="ds-label">Signal not found.</p>
      </main>
    );
  }

  const e = signal.enrichment ?? {};
  const [routed, archive] = await Promise.all([
    journalistsForSignal(tenantId!, id),
    archiveMatches(tenantId!, e.analyse?.entities ?? []),
  ]);
  const analyse = e.analyse ?? {};
  const classify = e.classify ?? {};
  const framing = e.framing ?? {};

  return (
    <main className="min-h-screen max-w-3xl mx-auto p-6 md:p-10">
      <header className="mb-8">
        <p className="ds-label mb-2">OnlineJourno · Signal</p>
        <h1
          className="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {signal.headline ?? signal.url}
        </h1>
        <SignalChips signal={signal} />
        <p
          className="text-sm mt-3"
          style={{
            fontFamily: "var(--font-ui)",
            color: "var(--color-fg-secondary)",
          }}
        >
          <a
            href={signal.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Open the record ↗
          </a>{" "}
          · published {formatDate(signal.published_at)}
        </p>
      </header>

      <p
        className="ds-label mb-3"
        title="The EIP pipeline, per signal: where it came from and what each layer added"
      >
        Provenance — what each layer added
      </p>
      <div className="space-y-3">
        <Stage label="① Source portal" by={signal.source_kind ?? "collector"}>
          <strong>{signal.source_name}</strong>
          {signal.source_family ? ` · family: ${signal.source_family}` : null}
          {signal.source_url ? (
            <>
              {" · "}
              <a
                className="underline"
                href={signal.source_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                portal
              </a>
            </>
          ) : null}
          <div
            className="text-xs mt-1"
            style={{ color: "var(--color-fg-tertiary)" }}
          >
            collected {formatDate(signal.fetched_at)} · language{" "}
            {signal.language}
          </div>
        </Stage>

        <Stage label="② Analyse" by="NLP / LLM">
          {analyse.summary ? <p className="mb-2">{analyse.summary}</p> : null}
          {(analyse.entities ?? []).length ? (
            <p>
              <strong>Entities:</strong> {(analyse.entities ?? []).join(" · ")}
            </p>
          ) : (
            <p style={{ color: "var(--color-fg-tertiary)" }}>
              Not yet enriched.
            </p>
          )}
          <p className="mt-1">
            <strong>Geo:</strong>{" "}
            {[signal.district, signal.region].filter(Boolean).join(", ") ||
              "not identified"}
          </p>
        </Stage>

        <Stage label="③ Classify" by="LLM">
          <p>
            <strong>Beat:</strong> {signal.beat ?? classify.beat ?? "—"} ·{" "}
            <strong>Reader need:</strong> {classify.user_need ?? "—"} ·{" "}
            <strong>Topic:</strong> {classify.topic ?? "—"}
          </p>
          {framing.frame ? (
            <p className="mt-1">
              <strong>PEJ frame:</strong> {framing.frame}
              {framing.rationale ? ` — ${framing.rationale}` : null}
            </p>
          ) : null}
        </Stage>

        <Stage label="④ Score" by="trend engine">
          {signal.trend_score != null ? (
            <p>
              <strong>Trend score:</strong> {signal.trend_score} — convergence
              across sources in the window (see{" "}
              <Link className="underline" href={`/${locale}/trends`}>
                Trends
              </Link>
              ).
            </p>
          ) : (
            <p style={{ color: "var(--color-fg-tertiary)" }}>
              No trend score yet — run <code>trends</code>.
            </p>
          )}
        </Stage>

        <Stage label="⑤ Route" by="beat / place match">
          {routed.length ? (
            <p>
              Reaches{" "}
              {routed.map((j, i) => (
                <span key={j.slug}>
                  {i > 0 ? ", " : ""}
                  <Link
                    className="underline"
                    href={`/${locale}/feed/${j.slug}`}
                  >
                    {j.name}
                  </Link>
                </span>
              ))}
              .
            </p>
          ) : (
            <p style={{ color: "var(--color-fg-tertiary)" }}>
              No journalist on this beat/place yet.
            </p>
          )}
        </Stage>

        <Stage label="⑥ Archive context" by="m-archive v1 — own coverage">
          {archive.length ? (
            <ul className="space-y-1">
              {archive.map((m) => (
                <li key={m.id}>
                  <a
                    className="underline"
                    href={m.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {m.headline ?? m.url}
                  </a>{" "}
                  <span style={{ color: "var(--color-fg-tertiary)" }}>
                    · {m.overlap} shared entit{m.overlap === 1 ? "y" : "ies"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "var(--color-fg-tertiary)" }}>
              No prior coverage of these entities in the connected corpus —
              a digitised archive plugs in via the connector seam (ADR 0042).
            </p>
          )}
        </Stage>
      </div>
    </main>
  );
}
